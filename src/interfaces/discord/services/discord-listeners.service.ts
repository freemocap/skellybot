import { Injectable, Logger } from '@nestjs/common';
import { Chatbot } from '../../../core/bot/bot.dto';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { Client, Message } from 'discord.js';
import { DiscordMessageService } from './threads/discord-message.service';
import { AiChatDocument } from '../../../core/database/collections/ai-chats/ai-chat.schema';

@Injectable()
export class DiscordListenersService {
  private _aiChats: Map<string, Chatbot> = new Map();
  public constructor(
    private readonly _client: Client,
    private readonly _logger: Logger,
    private readonly _aiChatsService: AiChatsService,
    private readonly _messageService: DiscordMessageService,
  ) {}

  public async start() {
    this._logger.log(
      'Starting up Discord listeners (like, listening for messages in threads the bot is in)',
    );
    const aiChatIds = await this._aiChatsService.findAllChatIds();
    this._logger.log(`Found ${aiChatIds.length} aiChatIds`);
    for (const aiChatId of aiChatIds) {
      this._logger.log(
        `NOT IMPLEMENTED YET - Starting listener for aiChatId ${aiChatId}`,
      );
      this._aiChats.set(aiChatId, new Chatbot());
    }
    // create a bot and load up its memory with the messages in the thread
  }
  public async startThreadListener(
    threadId: string,
    aiChat: AiChatDocument,
    bot: Chatbot,
  ) {
    this._logger.log(`Starting listener for threadId ${threadId}`);
    //TODO - load up the bot's memory with the messages in the thread
    this._aiChats.set(threadId, bot);
  }

  public async handleMessage(message: Message, bypassChecks: boolean = false) {
    if (!bypassChecks) {
      // if the message is from a bot, ignore it
      if (message.author.bot) {
        return;
      }
      // if first character of message is `~`, ignore it
      if (message.content.startsWith('~')) {
        return;
      }

      // TODO - if Bot is mentioned in the message, respond
      // if (message.mentions.has(this._client.user.id)) {
      //   await this._messageService.handleMessage(message);
      //   return;
      // }

      // if the message is not in a thread, ignore it
      if (!message.thread) {
        return;
      }

      // if the message is in a thread the bot is in, but the bot is not active in that thread, ignore it
      const aiChatBot = this._aiChats.get(message.thread.id);
      if (!aiChatBot) {
        return;
      }
    }
    // if the message is in a thread the bot is in, and the bot is active in that thread, process it
    await this._messageService.respondToMessage(message);
  }

  public async stop() {
    this._logger.log('Shutting down Discord listeners');
    this._client.removeAllListeners();
  }
}
