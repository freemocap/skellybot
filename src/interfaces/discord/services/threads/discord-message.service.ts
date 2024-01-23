import { Injectable, Logger } from '@nestjs/common';
import { AttachmentBuilder, Message } from 'discord.js';
import { ChatbotManagerService } from '../../../../core/chatbot/chatbot-manager.service';
import { DiscordMongodbService } from '../discord-mongodb.service';
import { DiscordContextService } from './discord-context.service';
import { DiscordAttachmentService } from './discord-attachment.service';
import { ChatbotResponseService } from '../../../../core/chatbot/chatbot-response.service';

@Injectable()
export class DiscordMessageService {
  constructor(
    private readonly _logger: Logger,
    private readonly _chatbotResponseService: ChatbotResponseService,
    private readonly _persistenceService: DiscordMongodbService,
    private readonly _contextService: DiscordContextService,
    private readonly _discordAttachmentService: DiscordAttachmentService,
  ) {}

  public async respondToMessage(discordMessage: Message, humanUserId: string) {
    const { humanInputText, attachmentText } =
      await this._extractMessageContent(discordMessage);
    this._logger.log(
      `Received message with${
        discordMessage.attachments.size > 0 ? ' ' : 'out '
      }attachment(s):\n\n ${humanInputText}`,
    );

    await this._handleStream(
      humanUserId,
      humanInputText,
      attachmentText,
      discordMessage,
    );
  }

  private async _handleStream(
    humanUserId: string,
    inputMessageText: string,
    attachmentText: string,
    discordMessage: Message<boolean>,
  ) {
    discordMessage.channel.sendTyping();

    const tokenStream = this._chatbotResponseService.streamResponse(
      discordMessage.channel.id,
      inputMessageText + attachmentText,
      {
        // topic: channel.topic,
      },
    );

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
    const contextRoute = this._contextService.getContextRoute(discordMessage);
    await this._persistenceService.persistInteraction(
      humanUserId,
      discordMessage.channel.id,
      contextRoute,
      discordMessage,
      attachmentText,
      replyMessage,
    );
  }

  private async _extractMessageContent(discordMessage: Message<boolean>) {
    let humanInputText = discordMessage.content;
    let attachmentText = '';
    if (discordMessage.attachments.size > 0) {
      if (humanInputText.length > 0) {
        humanInputText =
          'BEGIN TEXT FROM HUMAN INPUT:\n\n' +
          humanInputText +
          '\n\nEND TEXT FROM HUMAN INPUT\n\n';
      }
      attachmentText = 'BEGIN TEXT FROM ATTACHMENTS:\n\n';
      for (const [, attachment] of discordMessage.attachments) {
        const attachmentResponse =
          await this._discordAttachmentService.handleAttachment(attachment);
        attachmentText += attachmentResponse.text;
        if (attachmentResponse.type === 'transcript') {
          await discordMessage.reply(
            `\`\`\`\n\n${attachmentResponse.text}\n\n\`\`\``,
          );
        }
      }
      attachmentText += 'END TEXT FROM ATTACHMENTS';
    }
    return { humanInputText, attachmentText };
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
        'The full Ai response to message ID:${discordMessage.id}, ' +
        'which was split across multiple messages so is being sent as an' +
        ' attachment for convenience.',
    });
    await replyMessage.edit({
      files: [attachment],
    });
  }
}
