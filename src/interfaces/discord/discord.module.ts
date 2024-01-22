import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discord-ping.service';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordEventService } from './services/discord-event.service';
import { DiscordThreadService } from './services/threads/discord-thread.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/collections/users/users.module';
import { ChatbotModule } from '../../core/database/collections/chatbot/chatbot.module';
import { AiChatsModule } from '../../core/database/collections/ai-chats/ai-chats.module';
import { CoupletsModule } from '../../core/database/collections/couplets/couplets.module';
import { MessagesModule } from '../../core/database/collections/messages/messages.module';
import { DiscordContextService } from './services/threads/discord-context.service';
import { DiscordMongodbService } from './services/discord-mongodb.service';
import { DiscordMessageService } from './services/threads/discord-message.service';
import { OpenaiModule } from '../../core/ai/openai/openai.module';
import { DiscordAttachmentService } from './services/threads/discord-attachment.service';
import { DiscordThreadListenerService } from './services/discord-thread-listener.service';

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
    DiscordThreadListenerService,
    DiscordEventService,
    DiscordPingService,
    DiscordThreadService,
    DiscordMessageService,
    DiscordAttachmentService,
    DiscordContextService,
    DiscordMongodbService,
    Logger,
  ],
})
export class DiscordModule {}
