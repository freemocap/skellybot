import { Module } from '@nestjs/common';
import { DiscordPingService } from './services/discord-ping.service';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordEventService } from './services/events/discord-event.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/collections/users/users.module';
import { ChatbotModule } from '../../core/chatbot/chatbot.module';
import { AiChatsModule } from '../../core/database/collections/ai-chats/ai-chats.module';
import { CoupletsModule } from '../../core/database/collections/couplets/couplets.module';
import { MessagesModule } from '../../core/database/collections/messages/messages.module';
import { DiscordContextService } from './services/discord-context.service';
import { DiscordMongodbService } from './services/discord-mongodb.service';
import { DiscordMessageService } from './services/discord-message.service';
import { OpenaiModule } from '../../core/ai/openai/openai.module';
import { DiscordAttachmentService } from './services/discord-attachment.service';
import { DiscordOnMessageService } from './services/events/discord-on-message.service';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    GcpModule,
    UsersModule,
    ChatbotModule,
    AiChatsModule,
    CoupletsModule,
    MessagesModule,
    OpenaiModule,
  ],
  providers: [
    DiscordEventService,
    DiscordOnMessageService,
    DiscordPingService,
    DiscordMessageService,
    DiscordAttachmentService,
    DiscordContextService,
    DiscordMongodbService,
  ],
  exports: [DiscordMongodbService],
})
export class DiscordModule {}
