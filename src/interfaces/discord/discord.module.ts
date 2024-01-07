import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discord-ping.service';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordReadyService } from './services/discord-ready.service';
import { DiscordThreadService } from './services/discord-thread.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/schema/users/users.module';
import { BotModule } from '../../core/database/schema/bot/bot.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    GcpModule,
    UsersModule,
    BotModule,
  ],
  providers: [
    DiscordPingService,
    DiscordThreadService,
    DiscordReadyService,
    Logger,
  ],
})
export class DiscordModule {}
