import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Module({
  providers: [ConversationsService],
})
export class ConversationsModule {}
