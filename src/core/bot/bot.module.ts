import { Logger, Module } from '@nestjs/common';
import { LangchainModule } from '../ai/langchain/langchain.module';
import { BotService } from './bot.service';

@Module({
  imports: [LangchainModule],
  providers: [BotService, Logger],
  exports: [BotService],
})
export class BotModule {}
