import { Logger, Module } from '@nestjs/common';
import { LangchainModule } from '../../../ai/langchain/langchain.module';
import { ChatbotManagerService } from './chatbot-manager.service';
import { ChatbotResponseService } from './chatbot-response.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chatbot, ChatbotSchema } from './chatbot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chatbot.name, schema: ChatbotSchema }]),
    LangchainModule,
  ],
  providers: [ChatbotManagerService, ChatbotResponseService, Logger],
  exports: [ChatbotManagerService, ChatbotResponseService],
})
export class ChatbotModule {}
