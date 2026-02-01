// src/interfaces/discord/services/discord-on-message.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { Message, ThreadChannel } from 'discord.js';
import { DiscordMessageService } from './discord-message.service';
import { AiChatDocument } from '../../../core/database/collections/ai-chats/ai-chat.schema';
import { DiscordContextRouteService } from './discord-context-route.service';
import { UsersService } from '../../../core/database/collections/users/users.service';
import { OpenaiChatService } from '../../../core/ai/openai/openai-chat.service';
import { OpenaiAgentService } from '../../../core/ai/openai/openai-agent.service';
import { DiscordContextPromptService } from './discord-context-prompt.service';
import { OpenAIModelType, OpenaiConfigFactory } from '../../../core/ai/openai/openai-config.factory';

@Injectable()
export class DiscordOnMessageService {
  private activeChats = new Set<string>();
  private activeAgents = new Set<string>();
  private allAiChatsById = new Map<string, AiChatDocument>();
  private readonly logger = new Logger(DiscordOnMessageService.name);

  public constructor(
    private readonly aiChatsService: AiChatsService,
    private readonly messageService: DiscordMessageService,
    private readonly contextRouteService: DiscordContextRouteService,
    private readonly contextPromptService: DiscordContextPromptService,
    private readonly usersService: UsersService,
    private readonly openaiChatService: OpenaiChatService,
    private readonly openaiAgentService: OpenaiAgentService,
    private readonly configFactory: OpenaiConfigFactory,
  ) {}

  public async addActiveChat(message: Message, llmModel?: string, isAgent: boolean = false) {
    try {
      const aiChatId = message.channel.id;

      if (this.activeChats.has(aiChatId)) {
        this.logger.warn('Chat already exists in active chats');
        return;
      }

      const modelName = llmModel || 'gpt-4o';
      this.logger.debug('Adding chat with model: ' + modelName + ' (isAgent: ' + isAgent + ')');

      const ownerUser = await this._getOwnerUser(message);
      const contextRoute = this.contextRouteService.getContextRoute(message);
      const contextPrompt = await this.contextPromptService.getContextPromptFromMessage(message);

      if (isAgent) {
        this.openaiAgentService.createAgent(aiChatId, contextPrompt, []);
        this.activeAgents.add(aiChatId);
        this.logger.debug(`✓ Created agent for channel ${aiChatId}`);
      } else {
        const baseConfig = this.configFactory.getConfigForModel(modelName as OpenAIModelType);
        const validatedConfig = this.configFactory.validateConfig(baseConfig);
        this.openaiChatService.createChat(aiChatId, contextPrompt, validatedConfig);
        this.logger.debug(`✓ Created chat for channel ${aiChatId}`);
      }

      const aiChatDocument = await this.aiChatsService.createAiChat({
        aiChatId,
        ownerUser,
        contextRoute,
        contextInstructions: contextPrompt,
        couplets: [],
        modelName,
      });

      this.allAiChatsById.set(aiChatId, aiChatDocument);
      this.activeChats.add(aiChatId);
    } catch (error) {
      this.logger.error('Error in addActiveChat: ' + String(error));
      throw error;
    }
  }

  private _shouldRespondToMessage(message: Message<boolean>): boolean {
    if (message.author.bot || message.content.startsWith('~')) {
      return false;
    }
    const botId = message.client.user.id;
    return message.channel instanceof ThreadChannel && message.channel.ownerId === botId;
  }

  public async handleMessageCreation(message: Message<boolean>) {
    if (!this._shouldRespondToMessage(message)) {
      return;
    }
    this.logger.debug('Handling message creation');
    if (!this.activeChats.has(message.channel.id)) {
      await this._reloadChatFromDatabase(message);
    }
    
    // Check if this is an agent or regular chat
    const isAgent = this.activeAgents.has(message.channel.id);
    this.logger.debug(`Message in channel ${message.channel.id} - isAgent: ${isAgent}`);
    
    await this.messageService.respondToMessage(
      message,
      message,
      message.author.id,
      false,
      undefined,
      isAgent, // Pass the isAgent flag!
    );
  }

  private async _reloadChatFromDatabase(message: Message<boolean>) {
    this.logger.log('Loading chat from database');
    const ownerUser = await this._getOwnerUser(message);
    const populateCouplets = true;
    const aiChat = await this.aiChatsService.getOrCreateAiChat(
      {
        aiChatId: message.channel.id,
        ownerUser,
        contextRoute: this.contextRouteService.getContextRoute(message),
        contextInstructions: await this.contextPromptService.getContextPromptFromMessage(message),
        couplets: [],
        modelName: 'gpt-4o',
      },
      populateCouplets,
    );
    this.allAiChatsById.set(aiChat.aiChatId, aiChat);

    const isAgent = this.activeAgents.has(aiChat.aiChatId);
    this.logger.debug(`Reloaded chat ${aiChat.aiChatId} - isAgent: ${isAgent}`);
    
    if (isAgent) {
      await this.openaiAgentService.reloadAgent(aiChat);
    } else {
      await this.openaiChatService.reloadChat(aiChat);
    }
  }

  private async _getOwnerUser(message: Message<boolean>) {
    return await this.usersService.getOrCreateUser({
      identifiers: {
        discord: {
          id: message.author.id,
          username: message.author.username,
        },
      },
    });
  }

  async getActiveChatForChannel(channelId: string): Promise<AiChatDocument | null> {
    try {
      if (this.allAiChatsById.has(channelId)) {
        return this.allAiChatsById.get(channelId);
      }

      const chat = await this.aiChatsService.getAiChatById(channelId);
      if (chat) {
        this.allAiChatsById.set(channelId, chat);
      }
      return chat;
    } catch (error) {
      this.logger.error('Error fetching active chat: ' + String(error));
      return null;
    }
  }

  async updateActiveChatModel(channelId: string, newModel: OpenAIModelType): Promise<void> {
    const chat = await this.getActiveChatForChannel(channelId);
    if (!chat) {
      this.logger.error('No active chat found');
      throw new Error('No active chat found for this channel');
    }

    try {
      chat.modelName = newModel;
      await this.aiChatsService.updateAiChat(chat);
      this.allAiChatsById.set(channelId, chat);

      const isAgent = this.activeAgents.has(channelId);
      if (isAgent) {
        await this.openaiAgentService.reloadAgent(chat);
      } else {
        await this.openaiChatService.reloadChat(chat);
      }

      this.logger.log('Updated model for chat');
    } catch (error) {
      this.logger.error('Failed to update chat model: ' + String(error));
      throw error;
    }
  }
}
