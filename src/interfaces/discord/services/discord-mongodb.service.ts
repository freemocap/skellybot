import { Injectable } from '@nestjs/common';
import { CoupletsService } from '../../../core/database/collections/couplets/couplets.service';
import { MessagesService } from '../../../core/database/collections/messages/messages.service';
import { ContextRoute } from '../../../core/database/collections/ai-chats/context-route.provider';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { Message } from 'discord.js';

@Injectable()
export class DiscordMongodbService {
  constructor(
    private readonly _coupletService: CoupletsService,
    private readonly _aiChatsService: AiChatsService,
    private readonly _messageService: MessagesService,
  ) {}

  public async persistInteraction(
    aiChatId: string,
    contextRoute: ContextRoute,
    discordMessage: Message,
    replyMessage: Message,
  ) {
    const humanMessageForDb = await this._messageService.createMessage({
      contextRoute,
      messageId: discordMessage.id,
      speakerType: 'human',
      interfaceSource: 'discord',
      content: discordMessage.content,
      messageSentTimestamp: discordMessage.createdAt,
      metadata: {
        jump_url: discordMessage.url,
        ...JSON.parse(JSON.stringify(discordMessage)),
      },
    });

    const aiMessageForDb = await this._messageService.createMessage({
      contextRoute,
      messageId: replyMessage.id,
      speakerType: 'ai',
      interfaceSource: 'discord',
      content: replyMessage.content,
      messageSentTimestamp: replyMessage.createdAt,
      metadata: {
        jump_url: replyMessage.url,
        ...JSON.parse(JSON.stringify(replyMessage)),
      },
    });

    const couplet = await this._coupletService.createCouplet({
      contextRoute,
      humanMessage: humanMessageForDb,
      aiResponse: aiMessageForDb,
    });

    await this._aiChatsService.addCouplets(aiChatId, [couplet]);
  }
}
