import { Injectable, Logger } from '@nestjs/common';
import {
  AttachmentBuilder,
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
    let replyWasSplitAcrossMessages = false;
    let continuingFromString = '';
    let replyChunk = '';
    let fullAiResponse = '';
    for await (const current of tokenStream) {
      const { didResetOccur, theChunk } = current;
      if (!replyMessage) {
        replyMessage = await discordMessage.reply(theChunk);
        continue;
      }

      if (didResetOccur) {
        replyWasSplitAcrossMessages = true;
        continuingFromString =
          await this._handleMessageLengthOverflow(replyChunk);
        replyMessage = await replyMessage.reply(
          continuingFromString + theChunk,
        );
      }

      if (replyWasSplitAcrossMessages) {
        await replyMessage.edit(continuingFromString + theChunk);
      } else {
        await replyMessage.edit(theChunk);
      }

      replyChunk = theChunk;
      fullAiResponse = current.data;
    }
    this._logger.debug(`Full Ai response`, fullAiResponse);

    if (replyWasSplitAcrossMessages) {
      await this._sendFullResponseAsAttachment(
        fullAiResponse,
        discordMessage,
        replyMessage,
      );
    }
    const contextRoute = this._contextService.getContextRoute(channel, thread);
    await this._persistenceService.persistInteraction(
      thread.id,
      contextRoute,
      discordMessage,
      replyMessage,
    );
  }

  private async _handleMessageLengthOverflow(
    previousChunk: string,
    continuingFromStringLength: number = 50,
  ) {
    this._logger.debug(
      'Message too long for initial Discord message, creating new Discord message',
    );

    const words = previousChunk.split(/\s+/);

    const lastWords = [];
    let charCount = 0;

    // Iterate backwards through the words array and collect words until character count exceeds 20
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      const wordLength = word.length + (lastWords.length > 0 ? 1 : 0); // Add 1 for a space if not the first word
      if (charCount + wordLength > 20) break; // Stop if adding the next word would exceed 20 chars
      charCount += wordLength; // Increment the character count
      lastWords.unshift(word); // Add the word to the start of the array
    }

    // Handle the edge case of very long words
    let lastWordsStr;
    if (lastWords.length === 0) {
      // If the lastWords array is empty, just grab the last 30 characters from previousChunk
      lastWordsStr = '...' + previousChunk.slice(-continuingFromStringLength);
    } else {
      // Join the last N words into a string, separated by spaces
      lastWordsStr = lastWords.join(' ');
    }

    return `> continuing from \`...${lastWordsStr}...\`\n\n`;
  }

  private async _sendFullResponseAsAttachment(
    fullAiResponse: string,
    discordMessage: Message<boolean>,
    replyMessage: Message<boolean>,
  ) {
    // add full chunk to the message as a `.md` attachement
    const attachment = new AttachmentBuilder(Buffer.from(fullAiResponse), {
      name: `reply_to_discordMessageId_${discordMessage.id}.md`,
      description:
        'The full Ai reponse to message ID:${discordMessage.id}, ' +
        'which was split across multiple messages so is being sent as an' +
        ' attachment for convenience.',
    });
    await replyMessage.edit({
      files: [attachment],
    });
  }
}
