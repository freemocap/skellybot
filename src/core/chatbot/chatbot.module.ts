import { Logger, Module } from '@nestjs/common';
import { LangchainModule } from '../ai/langchain/langchain.module';
import { ChatbotManagerService } from './chatbot-manager.service';
import { ChatbotResponseService } from './chatbot-response.service';

@Module({
  imports: [LangchainModule],
  providers: [ChatbotManagerService, ChatbotResponseService, Logger],
  exports: [ChatbotManagerService, ChatbotResponseService],
})
export class ChatbotModule {}
