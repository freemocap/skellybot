import { Injectable, Logger } from '@nestjs/common';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { Message, ThreadChannel } from 'discord.js';
import { DiscordMessageService } from './discord-message.service';
import { AiChatDocument } from '../../../core/database/collections/ai-chats/ai-chat.schema';
import { DiscordContextRouteService } from './discord-context-route.service';
import { UsersService } from '../../../core/database/collections/users/users.service';
import {
  OpenAiChatConfig,
  OpenaiChatService,
} from '../../../core/ai/openai/openai-chat.service';
import { DiscordContextPromptService } from './discord-context-prompt.service';

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
  ) {}
  public async addActiveChat(message: Message) {
    try {
      this.logger.debug(
        `Adding threadId ${message.channel.id} to active chats`,
      );
      const aiChatId = message.channel.id;
      if (this.activeChats.has(aiChatId)) {
        throw new Error(`Chat ${aiChatId} already exists in active chats!`);
      }
      this.logger.debug(
        `Adding threadId ${message.channel.id} to active chats`,
      );

      const ownerUser = await this._getOwnerUser(message);

      const contextRoute = this._contextRouteService.getContextRoute(message);

      const contextPrompt =
        await this._contextPromptService.getContextPromptFromMessage(message);

      const chatConfig = {
        messages: [],
        model: 'gpt-4-vision-preview',
        temperature: 0.7,
        stream: true,
        max_tokens: 4096,
      } as OpenAiChatConfig;
      this._openaiChatService.createChat(aiChatId, contextPrompt, chatConfig);
      const aiChatDocument = await this._aiChatsService.createAiChat({
        aiChatId,
        ownerUser,
        contextRoute,
        contextInstructions: contextPrompt,
        couplets: [],
        modelName: 'gpt-4-vision-preview',
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
    // Ignore messages from bots or messages that start with `~`
    if (message.author.bot || message.content.startsWith('~')) {
      return false;
    }
    const botId = message.client.user.id;

    // Respond to messages that mention the bot
    if (message.mentions.has(botId)) {
      return true;
    }

    // Respond to messages in threads the bot created/owns
    if (
      message.channel instanceof ThreadChannel &&
      message.channel.ownerId === botId
    ) {
      return true;
    }

    // Otherwise, don't respond
    return false;
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
        modelName: 'gpt-4-vision-preview',
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
}
