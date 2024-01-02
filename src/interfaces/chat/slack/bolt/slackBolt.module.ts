import { slackServiceFactory } from './slackAppFactory';
import { Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { App } from '@slack/bolt';
import { SlackConfigService } from '../config/slackConfig.service';
import { GcpModule } from '../../../../shared/gcp/gcp.module';
import { SlackLoggerAdapter } from '../logging/slack-logger-proxy.service';

@Module({
  imports: [GcpModule],
  providers: [slackServiceFactory, SlackConfigService, SlackLoggerAdapter],
  exports: [slackServiceFactory],
})
export class SlackBoltModule implements OnModuleInit, OnApplicationShutdown {
  constructor(private readonly app: App) {}

  onModuleInit() {
    this.app.start();
  }

  async onApplicationShutdown() {
    await this.app.stop();
  }
}
