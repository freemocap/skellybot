import { Module, OnModuleInit } from '@nestjs/common';
import { GcpModule } from '../../../shared/gcp/gcp.module';
import { SlackInterfaceService } from './slackInterface.service';
import { SlackCommandMethodDiscovery } from './decorators/discovery';
import { DiscoveryModule } from '@golevelup/nestjs-discovery';
import { ChatbotModule } from '../../../shared/chatbot/chatbot.module';
import { SlackBoltModule } from './bolt/slackBolt.module';

@Module({
  imports: [SlackBoltModule, DiscoveryModule, ChatbotModule, GcpModule],
  providers: [SlackInterfaceService, SlackCommandMethodDiscovery],
})
export class SlackInterfaceModule implements OnModuleInit {
  constructor(
    private readonly _slackCommandDiscovery: SlackCommandMethodDiscovery,
  ) {}

  async onModuleInit() {
    await this._slackCommandDiscovery.bindSlackCommands();
    await this._slackCommandDiscovery.bindMessages();
  }
}
