import { Injectable, Logger } from '@nestjs/common';
import { AttachmentBuilder, Message } from 'discord.js';
import { DiscordMongodbService } from '../discord-mongodb.service';
import { DiscordContextService } from './discord-context.service';
import { DiscordAttachmentService } from './discord-attachment.service';
import { OpenaiChatService } from '../../../../core/ai/openai/openai-chat.service';

@Injectable()
export class DiscordMessageService {
  private readonly logger = new Logger(DiscordMessageService.name);
  constructor(
    private readonly _persistenceService: DiscordMongodbService,
    private readonly _contextService: DiscordContextService,
    private readonly _discordAttachmentService: DiscordAttachmentService,
    private readonly _openaiChatService: OpenaiChatService,
  ) {}

  public async respondToMessage(
    discordMessage: Message,
    humanUserId: string,
    isFirstExchange: boolean = false,
  ) {
    try {
      const { humanInputText, attachmentText } =
        await this._extractMessageContent(discordMessage);
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
      );
    } catch (error) {
      this.logger.error(`Error in respondToMessage: ${error}`);
    }
  }

  private async _handleStream(
    humanUserId: string,
    inputMessageText: string,
    attachmentText: string,
    discordMessage: Message<boolean>,
    isFirstExchange: boolean = false,
  ) {
    try {
      discordMessage.channel.sendTyping();

      const aiResponseStream = this._openaiChatService.getAiResponseStream(
        discordMessage.channel.id,
        inputMessageText + attachmentText,
      );
      const maxMessageLength = 2000 * 0.9; // discord max message length is 2000 characters (and *0.9 to be safe)

      const replyMessages: Message<boolean>[] = [
        await discordMessage.reply('Awaiting reply...'),
      ];
      let currentReplyMessage = replyMessages[0];
      let replyWasSplitAcrossMessages = false;
      let currentReplyMessageText = '';
      let proposedReplyMessageText = '';
      let fullAiTextResponse = '';
      for await (const incomingTextChunk of aiResponseStream) {
        if (!incomingTextChunk) {
          continue;
        }
        fullAiTextResponse += incomingTextChunk;

        proposedReplyMessageText += incomingTextChunk;

        // If the proposed text is less than the max message length, just add it to the current text
        if (proposedReplyMessageText.length < maxMessageLength) {
          currentReplyMessageText = proposedReplyMessageText;
          await currentReplyMessage.edit(currentReplyMessageText);
        } else {
          // Otherwise, split the message and start a new one
          this.logger.debug(
            'Reply message too long, splitting into multiple messages',
          );
          replyWasSplitAcrossMessages = true;
          const continuingFromString = `> continuing from \`...${currentReplyMessageText.slice(
            -50,
          )}...\`\n\n`;

          replyMessages.push(
            await currentReplyMessage.reply(continuingFromString),
          );
          currentReplyMessage = replyMessages[replyMessages.length - 1];
          proposedReplyMessageText = continuingFromString + incomingTextChunk;
          currentReplyMessageText = proposedReplyMessageText;
          await currentReplyMessage.edit(currentReplyMessageText);
        }
      }

      this.logger.debug(
        `Stream done! Full Ai response: \n\n${fullAiTextResponse}`,
      );

      if (replyWasSplitAcrossMessages) {
        await this._sendFullResponseAsAttachment(
          fullAiTextResponse,
          discordMessage,
          replyMessages[-1],
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
