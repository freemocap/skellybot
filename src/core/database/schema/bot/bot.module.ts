import { Logger, Module } from '@nestjs/common';

import { BotService } from './bot.service';
import { LangchainModule } from '../../../ai/langchain/langchain.module';

@Module({
  imports: [LangchainModule],
  providers: [BotService, Logger],
  exports: [BotService],
})
export class BotModule {}
