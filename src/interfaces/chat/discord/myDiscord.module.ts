import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discordPing.service';
import { NecordModule } from 'necord';
import { DiscordChatService } from './services/discordChat.service';
import { GcpModule } from '../../../shared/gcp/gcp.module';
import { NecordConfigService } from './services/necordConfig.service';
import { DiscordReadyLoggingService } from './services/discordReadyLogging.service';
import { LangchainModule } from '../../../shared/ai/langchain/langchain/langchain.module';
import { DiscordThreadService } from './services/discordThread.service';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: NecordConfigService,
    }),
    GcpModule,
    LangchainModule,
  ],
  providers: [
    DiscordPingService,
    DiscordChatService,
    DiscordThreadService,
    DiscordReadyLoggingService,
    Logger,
  ],
})
export class MyDiscordModule {}
