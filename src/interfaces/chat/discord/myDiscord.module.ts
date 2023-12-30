import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discordPing.service';
import { NecordModule } from 'necord';
import { DiscordChatService } from './services/discordChat.service';
import { GcpModule } from '../../../shared/gcp/gcp.module';
import { NecordConfigService } from './services/necordConfig.service';
import { DiscordReadyLoggingService } from './services/discordReadyLogging.service';
import { DiscordThreadService } from './services/discordThread.service';
import { ChatbotService } from '../../../shared/chatbot-core/chatbot.service';
import { ChatbotCoreModule } from '../../../shared/chatbot-core/chatbotCore.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: NecordConfigService,
    }),
    GcpModule,
    ChatbotCoreModule,
  ],
  providers: [
    DiscordPingService,
    DiscordThreadService,
    DiscordReadyLoggingService,
    Logger,
  ],
})
export class MyDiscordModule {}
