import { slackServiceFactory } from './slack-app-factory';
import { Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { App } from '@slack/bolt';
import { SlackConfigService } from '../config/slack-config.service';
import { SlackLoggerAdapter } from '../logging/slack-logger-proxy.service';
import { GcpModule } from '../../../core/gcp/gcp.module';

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
