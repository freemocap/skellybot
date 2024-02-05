import { Injectable, Logger } from '@nestjs/common';
import { CoupletsService } from '../../../core/database/collections/couplets/couplets.service';
import { MessagesService } from '../../../core/database/collections/messages/messages.service';
import { ContextRoute } from '../../../core/database/collections/ai-chats/context-route.provider';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import {
  AttachmentBuilder,
  Collection,
  Message,
  TextChannel,
} from 'discord.js';
import { AiChatDocument } from '../../../core/database/collections/ai-chats/ai-chat.schema';

@Injectable()
export class DiscordPersistenceService {
  private readonly logger = new Logger(DiscordPersistenceService.name);
  constructor(
    private readonly _coupletService: CoupletsService,
    private readonly _aiChatsService: AiChatsService,
    private readonly _messageService: MessagesService,
  ) {}

  public async persistInteraction(
    ownerUserId: string,
    aiChatId: string,
    contextRoute: ContextRoute,
    discordMessage: Message,
    attachmentText: string,
    replyMessages: Message[],
    fullAiTextResponse: string,
    isFirstExchange: boolean = false,
  ) {
    this.logger.debug(`Persisting interaction for ${aiChatId} to database...`);
    try {
      const humanMessageForDb = await this._messageService.createMessage({
        contextRoute,
        messageId: discordMessage.id,
        speakerType: 'human',
        speakerId: ownerUserId,
        interfaceSource: 'discord',
        content: discordMessage.content,
        attachmentText: attachmentText,
        messageSentTimestamp: discordMessage.createdAt,
        metadata: {
          jump_url: discordMessage.url,
          discord_messages: [[JSON.parse(JSON.stringify(discordMessage))]], //there should only ever be one discord message per human message, but we keep it in a list to match the format of the AI messages
        },
      });

      const lastMessage = replyMessages[replyMessages.length - 1];
      const aiMessageForDb = await this._messageService.createMessage({
        contextRoute,
        messageId: lastMessage.id, // Use the last message in the array as the 'anchor' for the AI message
        speakerType: 'ai',
        speakerId: lastMessage.author.id,
        interfaceSource: 'discord',
        content: fullAiTextResponse,
        attachmentText: '',
        messageSentTimestamp: lastMessage.createdAt,
        metadata: {
          jump_url: lastMessage.url,
          messages: replyMessages.map((message) =>
            JSON.parse(JSON.stringify(message)),
          ),
        },
      });

      const couplet = await this._coupletService.createCouplet({
        initialExchange: isFirstExchange,
        contextRoute,
        humanMessage: humanMessageForDb,
        aiResponse: aiMessageForDb,
      });

      await this._aiChatsService.addCouplets(aiChatId, [couplet]);
      await this.attachAiChatToOldestMessage(
        aiChatId,
        await this._aiChatsService.findOne(aiChatId),
        discordMessage.channel as TextChannel,
      );
    } catch (error) {
      this.logger.error(`Error persisting interaction: ${error}`);
    }
  }

  public async attachAiChatToOldestMessage(
    aiChatId: string,
    aiChatDocument: AiChatDocument,
    channel: TextChannel,
  ) {
    this.logger.debug(
      `Attaching chat document to oldest message in thread ${aiChatId}`,
    );
    // remove the _id field from the document
    const aiChatAsJson = JSON.parse(JSON.stringify(aiChatDocument, null, 2));
    delete aiChatAsJson._id;
    delete aiChatAsJson.__v;

    const oldestMessage = await this._findOldestMessage(channel);
    const aiChatAttachmentName = `chat-${aiChatId}.json`;
    const aiChatAttachment = new AttachmentBuilder(
      Buffer.from(JSON.stringify(aiChatDocument, null, 2)),
      { name: aiChatAttachmentName },
    );

    const existingAttachmentsCollection = oldestMessage.attachments.filter(
      (attachment) => attachment.name !== aiChatAttachmentName,
    );

    const existingAttachments = Array.from(
      existingAttachmentsCollection.values(),
    );

    await oldestMessage.edit({
      content: oldestMessage.content,
      files: [aiChatAttachment, ...existingAttachments],
    });
  }

  private async _findOldestMessage(
    channel: TextChannel,
  ): Promise<Message | null> {
    // Fetch the earliest message in the channel
    const allMessages = (await channel.messages.fetch({
      message: null,
      force: true,
    })) as unknown as Collection<string, Message>;

    // The first message in the collection will be the oldest
    const messages = allMessages.filter((msg) => !msg.system);
    return messages.last();
  }
}
