import { Module, OnModuleInit } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackCommandMethodDiscovery } from './decorators/discovery';
import { DiscoveryModule } from '@golevelup/nestjs-discovery';
import { SlackBoltModule } from './bolt/slack-bolt.module';
import { ChatbotModule } from '../../core/chatbot/chatbot.module';
import { GcpModule } from '../../core/gcp/gcp.module';

@Module({
  imports: [SlackBoltModule, DiscoveryModule, ChatbotModule, GcpModule],
  providers: [SlackService, SlackCommandMethodDiscovery],
})
export class SlackModule implements OnModuleInit {
  constructor(
    private readonly _slackCommandDiscovery: SlackCommandMethodDiscovery,
  ) {}

  async onModuleInit() {
    await this._slackCommandDiscovery.bindSlackCommands();
    await this._slackCommandDiscovery.bindMessages();
  }
}
