import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discord-ping.service';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordReadyService } from './services/discord-ready.service';
import { DiscordThreadService } from './services/discord-thread.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { ChatbotModule } from '../../core/chatbot/chatbot.module';
import { DatabaseModule } from '../../core/database/database.module';
import { UsersModule } from '../../core/database/schema/users/users.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    GcpModule,
    UsersModule,
    ChatbotModule,
  ],
  providers: [
    DiscordPingService,
    DiscordThreadService,
    DiscordReadyService,
    Logger,
  ],
})
export class DiscordModule {}
