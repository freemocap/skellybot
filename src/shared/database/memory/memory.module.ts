import { Module } from '@nestjs/common';
import { MongoChatHistoryModule } from './mongo-chat-history/mongo-chat-history.module';
import { MongoChatHistoryService } from './mongo-chat-history/mongo-chat-history.service';

@Module({
  imports: [MongoChatHistoryModule],
  providers: [MongoChatHistoryService, MemoryService],
  exports: [],
})
export class MemoryModule {}
