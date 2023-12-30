import { Logger, Module } from '@nestjs/common';
import { LangchainModule } from '../ai/langchain/langchain.module';
import { ChatbotService } from './chatbot.service';

@Module({
  imports: [LangchainModule],
  providers: [ChatbotService, Logger],
  exports: [ChatbotService],
})
export class ChatbotCoreModule {}
