import { Logger, Module } from '@nestjs/common';
import { LangchainModule } from '../ai/langchain/langchain.module';
import { ChatbotManagerService } from './chatbot-manager.service';
import { ChatbotResponseService } from './chatbot-response.service';
import { OpenaiModule } from '../ai/openai/openai.module';

@Module({
  imports: [LangchainModule, OpenaiModule],
  providers: [ChatbotManagerService, ChatbotResponseService, Logger],
  exports: [ChatbotManagerService, ChatbotResponseService],
})
export class ChatbotModule {}
