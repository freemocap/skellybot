import { Injectable, Logger } from '@nestjs/common';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { Client, Message } from 'discord.js';
import { DiscordMessageService } from './threads/discord-message.service';
import { ChatbotManagerService } from '../../../core/database/collections/chatbot/chatbot-manager.service';

@Injectable()
export class DiscordThreadListenerService {
  private activeThreadListeners = new Set<string>();
  public constructor(
    private readonly _client: Client,
    private readonly _logger: Logger,
    private readonly _aiChatsService: AiChatsService,
    private readonly _messageService: DiscordMessageService,
    private readonly _chatbotManagerService: ChatbotManagerService,
  ) {}

  public async start() {
    this._logger.log('Starting up Discord Thread listeners');
    const aiChatIds = await this._reloadChatbots();

    this._logger.log(`Found ${aiChatIds.length} aiChatIds`);
    this._logger.log('Starting listener for previous aiChats');
    // create a chatbot and load up its memory with the messages in the thread
    this._client.on('messageCreate', this.respondToThreadMessage.bind(this));
  }

  private async _reloadChatbots() {
    const aiChatIds = await this._aiChatsService.findAllChatIds();

    aiChatIds.forEach((aiChatId) => this.activeThreadListeners.add(aiChatId));
    return aiChatIds;
  }

  private async respondToThreadMessage(message: Message) {
    if (this.activeThreadListeners.has(message.channel.id)) {
      try {
        await this._messageService.respondToMessage(message);
      } catch (e) {
        this._logger.error(e);
        await message.channel.send(
          `There was an error responding to your message: \n\n > ${e}`,
        );
      }
    }
  }

  // Change startThreadListener to simply add the thread ID to the Set
  public async startThreadListener(threadId: string) {
    if (this.activeThreadListeners.has(threadId)) {
      this._logger.log(
        `Thread listener already started for threadId ${threadId}`,
      );
      return;
    }
    this._logger.log(`Adding threadId ${threadId} to active listeners`);
    this.activeThreadListeners.add(threadId);
  }

  public async stop() {
    this._logger.log('Shutting down Discord listeners');
    this._client.removeAllListeners();
  }
}
