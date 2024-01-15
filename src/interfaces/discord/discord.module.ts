import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discord-ping.service';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordReadyService } from './services/discord-ready.service';
import { DiscordThreadService } from './services/discord-thread.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/collections/users/users.module';
import { BotModule } from '../../core/bot/bot.module';
import { AiChatsModule } from '../../core/database/collections/ai-chats/ai-chats.module';
import { CoupletsModule } from '../../core/database/collections/couplets/couplets.module';
import { MessagesModule } from '../../core/database/collections/messages/messages.module';
import { DiscordContextService } from './services/discord-context.service';
import { DiscordPersistenceService } from './services/discord-persistence.service';
import { DiscordMessageService } from './services/discord-message.service';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    GcpModule,
    UsersModule,
    BotModule,
    AiChatsModule,
    CoupletsModule,
    MessagesModule,
  ],
  providers: [
    DiscordReadyService,
    DiscordPingService,
    DiscordThreadService,
    DiscordMessageService,
    DiscordContextService,
    DiscordPersistenceService,
    Logger,
  ],
})
export class DiscordModule {}
