import { MongoChatHistoryService } from './mongo-chat-history/mongo-chat-history.service';
import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { BufferMemory } from 'langchain/memory';

@Injectable()
export class MemoryService {
  private readonly _collectionName = 'chat-history';

  async createMemory() {
    const memory = new BufferMemory({
      chatHistory: new this._mongoChatHistoryService(),
    });
  }
}
