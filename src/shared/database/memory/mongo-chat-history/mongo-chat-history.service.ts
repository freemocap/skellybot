// mongodb-chat-message-history.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MongoChatHistory,
  MongoDBChatMessageHistoryDocument,
} from './mongo-chat-history.schema';
import {
  BaseMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';

@Injectable()
export class MongoChatHistoryService {
  constructor(
    @InjectModel(MongoChatHistory.name)
    private readonly chatMessageHistoryModel: Model<MongoDBChatMessageHistoryDocument>,
  ) {}

  async getMessages(sessionId: string): Promise<BaseMessage[]> {
    const document = await this.chatMessageHistoryModel
      .findOne({ sessionId })
      .exec();
    const messages = document?.messages || [];
    // @ts-ignore
    return mapStoredMessagesToChatMessages(messages);
  }

  async addMessage(sessionId: string, message: BaseMessage): Promise<void> {
    const messages = mapChatMessagesToStoredMessages([message]);
    await this.chatMessageHistoryModel
      .updateOne(
        { sessionId },
        {
          $push: { messages: { $each: messages } },
        },
        { upsert: true },
      )
      .exec();
  }

  async clear(sessionId: string): Promise<void> {
    await this.chatMessageHistoryModel.deleteOne({ sessionId }).exec();
  }
}
