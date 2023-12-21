import { Logger, Module } from '@nestjs/common';
import { DiscordPingService } from './services/discordPing.service';
import { NecordModule } from 'necord';
import { DiscordWowService } from './services/discordWow.service';
import { DiscordChatService } from './services/discordChat.service';
import { GcpModule } from '../../gcp/gcp.module';
import { NecordConfigService } from './services/necordConfig.service';
import { DiscordReadyService } from './services/discordReady.service';
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
    DiscordWowService,
    DiscordChatService,
    DiscordReadyService,
    Logger,
  ],
})
export class MyDiscordModule {}
