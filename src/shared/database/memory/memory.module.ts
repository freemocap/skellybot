import { Module } from '@nestjs/common';
import { MongoChatHistoryModule } from './mongo-chat-history/mongo-chat-history.module';
import { MongoChatHistoryService } from './mongo-chat-history/mongo-chat-history.service';
import { MemoryService } from './memory.service';

@Module({
  imports: [MongoChatHistoryService],
  providers: [MongoChatHistoryService, MemoryService],
  exports: [],
})
export class MemoryModule {}
