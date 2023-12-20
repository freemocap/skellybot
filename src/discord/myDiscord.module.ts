import {Logger, Module} from '@nestjs/common';
import {MyDiscordService} from './myDiscord.service';
import {DiscordPingService} from './discordPing.service';
import {NecordModule} from 'necord';
import {DiscordWowService} from './discordWow.service';
import {DiscordChatService} from './discordLangchain.service';
import {GcpModule} from "../gcp/gcp.module";
import {NecordConfigService} from "./necordConfig.service";

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: NecordConfigService
    }),
  ],
  providers: [
    MyDiscordService,
    DiscordPingService,
    DiscordWowService,
    DiscordChatService,
    Logger,
  ],
})
export class MyDiscordModule {
}
