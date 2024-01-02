import { slackServiceFactory } from './slackAppFactory';
import { Module, OnModuleInit } from '@nestjs/common';
import { App } from '@slack/bolt';
import { SlackConfigService } from '../config/slackConfig.service';
import { GcpModule } from '../../../../shared/gcp/gcp.module';

@Module({
  imports: [GcpModule],
  providers: [slackServiceFactory, SlackConfigService],
  exports: [slackServiceFactory],
})
export class SlackBoltModule implements OnModuleInit {
  constructor(private readonly app: App) {}

  onModuleInit() {
    this.app.start();
  }
}
