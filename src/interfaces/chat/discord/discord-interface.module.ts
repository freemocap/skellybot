import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discordPing.service';
import { NecordModule } from 'necord';
import { GcpModule } from '../../../shared/gcp/gcp.module';
import { NecordConfigService } from './services/necordConfig.service';
import { DiscordReadyLoggingService } from './services/discordReadyLogging.service';
import { DiscordThreadService } from './services/discordThread.service';
import { ChatbotModule } from '../../../shared/chatbot/chatbot.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: NecordConfigService,
    }),
    GcpModule,
    ChatbotModule,
  ],
  providers: [
    DiscordPingService,
    DiscordThreadService,
    DiscordReadyLoggingService,
    Logger,
  ],
})
export class DiscordInterfaceModule {}
