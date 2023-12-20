import {Module} from '@nestjs/common';
import {SlackModule} from 'nestjs-slack';
import {SlackConfigService} from "./slackConfig.service";
import {GcpModule} from "../gcp/gcp.module";

@Module({
  imports: [
    SlackModule.forRootAsync({
      imports: [GcpModule],
      useClass: SlackConfigService
    }),
  ],
  providers: [],
})
export class MySlackModule {
}
