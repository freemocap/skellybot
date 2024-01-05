import { MongoChatHistoryService } from './mongo-chat-history/mongo-chat-history.service';
import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { BufferMemory } from 'langchain/memory';

@Injectable()
export class MemoryService{
    constructor(
      private readonly _mongoChatHistoryService: MongoChatHistoryService,
    ) {}

  async createMemory() {
    const sessionId = new ObjectId().toString();

    const memory = new BufferMemory({
      chatHistory: this._mongoChatHistoryService.createChatHistory(sessionId),
    });
  }
  }
  )
