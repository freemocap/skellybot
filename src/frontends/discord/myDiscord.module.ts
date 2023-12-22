import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discordPing.service';
import { NecordModule } from 'necord';
import { DiscordChatService } from './services/discordChat.service';
import { GcpModule } from '../../gcp/gcp.module';
import { NecordConfigService } from './services/necordConfig.service';
import { DiscordReadyLoggingService } from './services/discordReadyLogging.service';
import { LangchainModule } from '../../ai/langchain /langchain/langchain.module';

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
    DiscordReadyLoggingService,
    Logger,
  ],
})
export class MyDiscordModule {}
