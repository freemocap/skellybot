import { Injectable, Logger } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  Message,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { BotService } from '../../../core/bot/bot.service';
import { DiscordPersistenceService } from './discord-persistence.service';
import { DiscordContextService } from './discord-context.service';

@Injectable()
export class DiscordMessageService {
  constructor(
    private readonly _logger: Logger,
    private readonly _botService: BotService,
    private readonly _persistenceService: DiscordPersistenceService,
    private readonly _contextService: DiscordContextService,
  ) {}

  public beginWatchingIncomingMessages(
    interaction: ChatInputCommandInteraction,
    channel: TextChannel,
    thread: ThreadChannel,
  ) {
    const handleMessageCreation = async (discordMessage: Message) => {
      if (discordMessage.author.bot) {
        return;
      }
      if (discordMessage.channelId !== thread.id) {
        return;
      }

      this._logger.log(`Received message ${discordMessage.content}`);
      await this._handleStream(
        channel,
        thread,
        discordMessage.content,
        discordMessage,
      );
    };

    interaction.client.on('messageCreate', handleMessageCreation);
  }
  public async sendInitialReply(
    interaction: ChatInputCommandInteraction,
    channel: TextChannel,
    thread: ThreadChannel,
    inputText: string,
  ) {
    const initialMessage = await thread.send(inputText);
    await interaction.editReply('Thread Created!');
    await this._handleStream(channel, thread, inputText, initialMessage);
  }

  private async _handleStream(
    channel: TextChannel,
    thread: ThreadChannel,
    inputText: string,
    discordMessage: Message<boolean>,
  ) {
    thread.sendTyping();

    const tokenStream = this._botService.streamResponse(thread.id, inputText, {
      topic: channel.topic,
    });

    let replyMessage: Message<boolean> = undefined;
    let final = '';
    for await (const current of tokenStream) {
      const { theChunk, didResetOccur } = current;

      if (!replyMessage) {
        replyMessage = await discordMessage.reply(theChunk);
        continue;
      }

      if (didResetOccur) {
        replyMessage = await discordMessage.reply(theChunk);
        continue;
      }

      await replyMessage.edit(theChunk);
      final = current.data;
    }
    const contextRoute = this._contextService.getContextRoute(channel, thread);
    this._logger.debug(`Final thingy`, final);
    this._persistenceService.persistInteraction(
      thread.id,
      contextRoute,
      discordMessage,
      replyMessage,
    );
  }
}
