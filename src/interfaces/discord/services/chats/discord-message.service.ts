import { Injectable, Logger } from '@nestjs/common';
import { AttachmentBuilder, Message, TextBasedChannel } from 'discord.js';
import { DiscordMongodbService } from '../discord-mongodb.service';
import { DiscordContextService } from './discord-context.service';
import { DiscordAttachmentService } from './discord-attachment.service';
import { OpenaiChatService } from '../../../../core/ai/openai/openai-chat.service';

@Injectable()
export class DiscordMessageService {
  private readonly maxMessageLength = 2000 * 0.85; // discord max message length is 2000 characters (and * 0.85 to be safe)
  private readonly logger = new Logger(DiscordMessageService.name);
  constructor(
    private readonly _persistenceService: DiscordMongodbService,
    private readonly _contextService: DiscordContextService,
    private readonly _discordAttachmentService: DiscordAttachmentService,
    private readonly _openaiChatService: OpenaiChatService,
  ) {}

  public async respondToMessage(
    discordMessage: Message,
    respondToChannelOrMessage: Message<boolean> | TextBasedChannel,
    humanUserId: string,
    isFirstExchange: boolean = false,
  ) {
    await discordMessage.channel.sendTyping();
    try {
      const { humanInputText, attachmentText } =
        await this.extractMessageContent(
          discordMessage,
          respondToChannelOrMessage,
        );
      this.logger.log(
        `Received message with${
          discordMessage.attachments.size > 0 ? ' ' : 'out '
        }attachment(s):\n\n ${humanInputText}`,
      );

      await this._handleStream(
        humanUserId,
        humanInputText,
        attachmentText,
        discordMessage,
        isFirstExchange,
        respondToChannelOrMessage,
      );
    } catch (error) {
      this.logger.error(`Error in respondToMessage: ${error}`);
    }
  }

  public async sendChunkedMessage(
    channelOrMessage: Message<boolean> | TextBasedChannel,
    responseText: string,
  ) {
    const messageParts = this._getChunks(responseText, this.maxMessageLength);
    const replyMessages: Message<boolean>[] = [];

    if (channelOrMessage instanceof Message) {
      replyMessages.push(await channelOrMessage.reply(messageParts[0]));
    } else {
      replyMessages.push(await channelOrMessage.send(messageParts[0]));
    }

    if (messageParts.length > 1) {
      // Send the rest of the message parts as replies to the first message
      for (const textChunk of messageParts.slice(1)) {
        replyMessages.push(
          await replyMessages[replyMessages.length - 1].reply(textChunk),
        );
      }

      await this._sendFullResponseAsAttachment(
        responseText,
        channelOrMessage.id,
        replyMessages[replyMessages.length - 1],
      );
    }
    return replyMessages;
  }

  private _getChunks(text: string, maxChunkSize: number): string[] {
    const chunks = [];
    while (text.length) {
      const chunkSize = Math.min(text.length, maxChunkSize);
      const chunk = text.slice(0, chunkSize);
      chunks.push(chunk);
      text = text.slice(chunkSize);
    }
    return chunks;
  }

  private async _handleStream(
    humanUserId: string,
    inputMessageText: string,
    attachmentText: string,
    discordMessage: Message<boolean>,
    isFirstExchange: boolean = false,
    respondToChannelOrMessage: Message<boolean> | TextBasedChannel,
  ) {
    try {
      const aiResponseStream = this._openaiChatService.getAiResponseStream(
        discordMessage.channel.id,
        inputMessageText + attachmentText,
      );
      const maxMessageLength = 2000 * 0.9; // discord max message length is 2000 characters (and *0.9 to be safe)

      let currentReplyMessage: Message<boolean>;
      if (respondToChannelOrMessage instanceof Message) {
        currentReplyMessage =
          await respondToChannelOrMessage.reply('Awaiting reply...');
      } else {
        currentReplyMessage =
          await respondToChannelOrMessage.send('Awaiting reply...');
      }
      const replyMessages: Message<boolean>[] = [currentReplyMessage];

      let currentReplyMessageText = '';
      let fullAiTextResponse = '';
      for await (const incomingTextChunk of aiResponseStream) {
        if (!incomingTextChunk) {
          continue;
        }
        fullAiTextResponse += incomingTextChunk;

        // If the proposed text is less than the max message length, just add it to the current text
        if (
          currentReplyMessageText.length + incomingTextChunk.length <
          maxMessageLength
        ) {
          currentReplyMessageText += incomingTextChunk;
          await currentReplyMessage.edit(currentReplyMessageText);
        } else {
          // Otherwise, split the message and start a new one
          this.logger.debug(
            'Reply message too long, splitting into multiple messages',
          );
          const continuingFromString = `> continuing from \`...${currentReplyMessageText.slice(
            -50,
          )}...\`\n\n`;

          replyMessages.push(
            await currentReplyMessage.reply(continuingFromString),
          );
          currentReplyMessage = replyMessages[replyMessages.length - 1];
          currentReplyMessageText = continuingFromString + incomingTextChunk;
          await currentReplyMessage.edit(currentReplyMessageText);
        }
      }

      this.logger.debug(
        `Stream done! Full Ai response: \n\n${fullAiTextResponse}`,
      );

      if (replyMessages.length > 1) {
        await this._sendFullResponseAsAttachment(
          fullAiTextResponse,
          discordMessage.id,
          replyMessages[replyMessages.length - 1],
        );
      }
      await this._persistenceService.persistInteraction(
        humanUserId,
        discordMessage.channel.id,
        await this._contextService.getContextRoute(discordMessage),
        discordMessage,
        attachmentText,
        replyMessages,
        fullAiTextResponse,
        isFirstExchange,
      );
    } catch (error) {
      this.logger.error(`Error in _handleStream: ${error}`);
    }
  }

  public async extractMessageContent(
    discordMessage: Message<boolean>,
    respondToChannelOrMessage?: Message<boolean> | TextBasedChannel,
  ) {
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
        if (
          respondToChannelOrMessage &&
          attachmentResponse.type === 'transcript'
        ) {
          const replyMessages = await this.sendChunkedMessage(
            respondToChannelOrMessage,
            attachmentText,
          );
          const verboseJsonBuffer = Buffer.from(
            JSON.stringify(attachmentResponse.verboseOutput, null, 4),
            'utf-8',
          );
          await replyMessages[replyMessages.length - 1].edit({
            content: replyMessages[replyMessages.length - 1].content,
            files: [
              {
                attachment: verboseJsonBuffer,
                name: `message-${discordMessage.id}-transcription.json`,
              },
            ],
          });
        }
        attachmentText += 'END TEXT FROM ATTACHMENTS';
      }
    }
    return { humanInputText, attachmentText };
  }

  private async _sendFullResponseAsAttachment(
    fullAiResponse: string,
    discordMessageId: string,
    replyMessage: Message<boolean>,
  ) {
    const attachment = new AttachmentBuilder(Buffer.from(fullAiResponse), {
      name: `full_response_to_discordMessageId_${discordMessageId}.md`,
      description:
        'The full Ai response to message ID:${discordMessage.id}, ' +
        'which was split across multiple messages so is being sent as an' +
        ' attachment for convenience.',
    });
    await replyMessage.edit({
      content: replyMessage.content,
      files: [attachment],
    });
  }
}
