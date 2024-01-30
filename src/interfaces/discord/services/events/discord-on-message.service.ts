import { Injectable, Logger } from '@nestjs/common';
import { AiChatsService } from '../../../../core/database/collections/ai-chats/ai-chats.service';
import { Message, ThreadChannel } from 'discord.js';
import { DiscordMessageService } from '../chats/discord-message.service';
import { ChatbotManagerService } from '../../../../core/chatbot/chatbot-manager.service';
import { AiChatDocument } from '../../../../core/database/collections/ai-chats/ai-chat.schema';
import { DiscordContextService } from '../chats/discord-context.service';
import { UsersService } from '../../../../core/database/collections/users/users.service';
import { OpenaiChatService } from '../../../../core/ai/openai/openai-chat.service';

@Injectable()
export class DiscordOnMessageService {
  private activeChats = new Set<string>();
  private allAiChatsById = new Map<string, AiChatDocument>();
  private readonly logger = new Logger(DiscordOnMessageService.name);

  public constructor(
    private readonly _aiChatsService: AiChatsService,
    private readonly _messageService: DiscordMessageService,
    private readonly _chatbotManagerService: ChatbotManagerService,
    private readonly _contextService: DiscordContextService,
    private readonly _usersService: UsersService,
    private readonly _openaiChatService: OpenaiChatService,
  ) {}
  public async addActiveChat(message: Message) {
    const aiChatId = message.channel.id;
    if (this.activeChats.has(aiChatId)) {
      throw new Error(`Chat ${aiChatId} already exists in active chats!`);
    }
    this.logger.debug(`Adding threadId ${message.channel.id} to active chats`);

    const ownerUser = await this._getOwnerUser(message);

    const contextRoute = this._contextService.getContextRoute(message);

    const contextInstructions =
      await this._contextService.getContextInstructions(message);

    // await this._chatbotManagerService.createBot(
    //   aiChatId,
    //   'gpt-4-1106-preview',
    //   contextInstructions,
    // );

    this._openaiChatService.createChat(aiChatId, contextInstructions, {
      messages: [],
      model: 'gpt-4-1106-preview',
      temperature: 0.7,
      stream: true,
    });
    const aiChat = await this._aiChatsService.createAiChat({
      aiChatId,
      ownerUser,
      contextRoute,
      contextInstructions,
      couplets: [],
      modelName: 'gpt-4-1106-preview',
    });

    this.logger.debug(`Adding threadId ${aiChatId} to active listeners`);
    this.allAiChatsById.set(aiChatId, aiChat);
    this.activeChats.add(aiChatId);
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
        contextRoute: this._contextService.getContextRoute(message),
        contextInstructions:
          await this._contextService.getContextInstructions(message),
        couplets: [],
        modelName: 'gpt-4-1106-preview',
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
