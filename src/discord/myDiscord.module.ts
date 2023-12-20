import {Logger, Module} from '@nestjs/common';
import {DiscordPingService} from './discordPing.service';
import {NecordModule} from 'necord';
import {DiscordWowService} from './discordWow.service';
import {DiscordChatService} from './discordLangchain.service';
import {GcpModule} from "../gcp/gcp.module";
import {NecordConfigService} from "./necordConfig.service";
import {DiscordReadyService} from "./discordReady.service";

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: NecordConfigService
    }),
  ],
  providers: [
    DiscordPingService,
    DiscordWowService,
    DiscordChatService,
    DiscordReadyService,
    Logger,
  ],
})
export class MyDiscordModule {
}
