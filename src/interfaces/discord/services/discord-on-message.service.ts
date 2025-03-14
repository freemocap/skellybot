// src/interfaces/discord/services/discord-on-message.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { Message, ThreadChannel } from 'discord.js';
import { DiscordMessageService } from './discord-message.service';
import { AiChatDocument } from '../../../core/database/collections/ai-chats/ai-chat.schema';
import { DiscordContextRouteService } from './discord-context-route.service';
import { UsersService } from '../../../core/database/collections/users/users.service';
import {
  //OpenAiChatConfig,
  OpenaiChatService,
} from '../../../core/ai/openai/openai-chat.service';
import { DiscordContextPromptService } from './discord-context-prompt.service';
import {
  OpenAIModelType,
  OpenaiConfigFactory,
} from '../../../core/ai/openai/openai-config.factory';

@Injectable()
export class DiscordOnMessageService {
  private activeChats = new Set<string>();
  private allAiChatsById = new Map<string, AiChatDocument>();
  private readonly logger = new Logger(DiscordOnMessageService.name);

  public constructor(
    private readonly _aiChatsService: AiChatsService,
    private readonly _messageService: DiscordMessageService,
    private readonly _contextRouteService: DiscordContextRouteService,
    private readonly _contextPromptService: DiscordContextPromptService,
    private readonly _usersService: UsersService,
    private readonly _openaiChatService: OpenaiChatService,
    private readonly _configFactory: OpenaiConfigFactory,
  ) {}

  public async addActiveChat(message: Message, llmModel?: string) {
    try {
      const aiChatId = message.channel.id;

      // Check if chat exists and handle gracefully
      if (this.activeChats.has(aiChatId)) {
        this.logger.warn(
          `Chat ${aiChatId} already exists in active chats - skipping creation`,
        );
        return;
      }

      const modelName = llmModel || 'gpt-4o';
      this.logger.debug(
        `Adding threadId ${message.channel.id} to active chats with model: ${modelName}`,
      );

      const ownerUser = await this._getOwnerUser(message);
      const contextRoute = this._contextRouteService.getContextRoute(message);
      const contextPrompt =
        await this._contextPromptService.getContextPromptFromMessage(message);

      // Get validated config from factory
      const baseConfig = this._configFactory.getConfigForModel(
        modelName as OpenAIModelType,
      );
      const validatedConfig = this._configFactory.validateConfig(baseConfig);

      this._openaiChatService.createChat(
        aiChatId,
        contextPrompt,
        validatedConfig,
      );
      const aiChatDocument = await this._aiChatsService.createAiChat({
        aiChatId,
        ownerUser,
        contextRoute,
        contextInstructions: contextPrompt,
        couplets: [],
        modelName,
      });

      this.logger.debug(`Adding threadId ${aiChatId} to active listeners`);
      this.allAiChatsById.set(aiChatId, aiChatDocument);
      this.activeChats.add(aiChatId);
    } catch (error) {
      this.logger.error(`Error in addActiveChat: ${error}`);
      throw error;
    }
  }

  private _shouldRespondToMessage(message: Message<boolean>): boolean {
    if (message.author.bot || message.content.startsWith('~')) {
      return false;
    }
    const botId = message.client.user.id;

    return (
      message.channel instanceof ThreadChannel &&
      message.channel.ownerId === botId
    );
  }

  public async handleMessageCreation(message: Message<boolean>) {
    if (!this._shouldRespondToMessage(message)) {
      return;
    }
    this.logger.debug(`Handling creation of message ${message.id}`);
    if (!this.activeChats.has(message.channel.id)) {
      await this._reloadChatFromDatabase(message);
    }
    await this._messageService.respondToMessage(
      message,
      message,
      message.author.id,
    );
  }

  private async _reloadChatFromDatabase(message: Message<boolean>) {
    this.logger.log(
      `Loading chatbot for threadId: ${message.channel.id} from database`,
    );
    const ownerUser = await this._getOwnerUser(message);
    const populateCouplets = true;
    const aiChat = await this._aiChatsService.getOrCreateAiChat(
      {
        aiChatId: message.channel.id,
        ownerUser,
        contextRoute: this._contextRouteService.getContextRoute(message),
        contextInstructions:
          await this._contextPromptService.getContextPromptFromMessage(message),
        couplets: [],
        modelName: 'gpt-4o',
      },
      populateCouplets,
    );
    this.allAiChatsById.set(aiChat.aiChatId, aiChat);

    await this._openaiChatService.reloadChat(aiChat);
  }

  private async _getOwnerUser(message: Message<boolean>) {
    return await this._usersService.getOrCreateUser({
      identifiers: {
        discord: {
          id: message.author.id,
          username: message.author.username,
        },
      },
    });
  }

  async getActiveChatForChannel(
    channelId: string,
  ): Promise<AiChatDocument | null> {
    try {
      // First check the in-memory cache
      if (this.allAiChatsById.has(channelId)) {
        return this.allAiChatsById.get(channelId);
      }

      // Otherwise fetch from the database
      const chat = await this._aiChatsService.getAiChatById(channelId);
      if (chat) {
        this.allAiChatsById.set(channelId, chat);
      }
      return chat;
    } catch (error) {
      this.logger.error(
        `Error fetching active chat for channel ${channelId}: ${error}`,
      );
      return null;
    }
  }

  async updateActiveChatModel(
    channelId: string,
    newModel: OpenAIModelType,
  ): Promise<void> {
    // Find the chat document
    const chat = await this.getActiveChatForChannel(channelId);
    if (!chat) {
      this.logger.error(`No active chat found for channel ${channelId}`);
      throw new Error('No active chat found for this channel');
    }

    try {
      // Update the model in the database
      chat.modelName = newModel;
      await this._aiChatsService.updateAiChat(chat);

      // Update the in-memory cache
      this.allAiChatsById.set(channelId, chat);

      // Reload the chat with the new model in the OpenAI service
      await this._openaiChatService.reloadChat(chat);

      this.logger.log(`Updated model for chat ${chat.aiChatId} to ${newModel}`);
    } catch (error) {
      this.logger.error(`Failed to update chat model: ${error}`);
      throw error;
    }
  }
}
