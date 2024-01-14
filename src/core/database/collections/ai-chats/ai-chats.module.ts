import { Module } from '@nestjs/common';
import { AiChatsService } from './ai-chats.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AiChat, AiChatSchema } from './ai-chat.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AiChat.name, schema: AiChatSchema }]),
  ],
  providers: [AiChatsService],
  exports: [AiChatsService],
})
export class AiChatsModule {}
