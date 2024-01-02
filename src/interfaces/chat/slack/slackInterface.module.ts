import { Module, OnModuleInit } from '@nestjs/common';
import { GcpModule } from '../../../shared/gcp/gcp.module';
import { SlackInterfaceService } from './slackInterface.service';
import { SlackCommandMethodDiscovery } from './decorators/discovery';
import { DiscoveryModule } from '@golevelup/nestjs-discovery';
import { ChatbotCoreModule } from '../../../shared/chatbot-core/chatbotCore.module';
import { SlackBoltModule } from './bolt/slackBolt.module';

@Module({
  imports: [SlackBoltModule, DiscoveryModule, ChatbotCoreModule, GcpModule],
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
