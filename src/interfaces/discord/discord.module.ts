import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discord-ping.service';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordReadyService } from './services/discord-ready.service';
import { DiscordThreadService } from './services/discord-thread.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/collections/users/users.module';
import { BotModule } from '../../core/bot/bot.module';
import { ConversationsModule } from '../../core/database/collections/conversations/conversations.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    GcpModule,
    UsersModule,
    BotModule,
    ConversationsModule,
  ],
  providers: [
    DiscordPingService,
    DiscordThreadService,
    DiscordReadyService,
    Logger,
  ],
})
export class DiscordModule {}
