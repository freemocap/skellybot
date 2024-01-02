import { slackServiceFactory } from './slackAppFactory';
import { Module, OnModuleInit } from '@nestjs/common';
import { App } from '@slack/bolt';

@Module({
  providers: [slackServiceFactory],
  exports: [slackServiceFactory],
})
export class SlackBoltModule implements OnModuleInit {
  constructor(private readonly app: App) {}

  onModuleInit() {
    this.app.start();
  }
}
