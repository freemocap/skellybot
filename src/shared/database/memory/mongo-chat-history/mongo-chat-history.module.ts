import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MongoChatHistory,
  MongoChatHistorySchema,
} from './mongo-chat-history.schema';
import { MongoChatHistoryService } from './mongo-chat-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MongoChatHistory.name,
        schema: MongoChatHistorySchema,
      },
    ]),
  ],
  providers: [
    {
      provide: 'COLLECTION_NAME',
      useValue: 'chat-history',
    },

    MongoChatHistoryService,
  ],
  exports: [MongoChatHistoryService],
})
export class MongoChatHistoryModule {}
