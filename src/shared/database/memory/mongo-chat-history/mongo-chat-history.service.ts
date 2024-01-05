import { Inject, Injectable } from '@nestjs/common';

import { MongoDBChatMessageHistory } from '@langchain/community/dist/stores/message/mongodb';
import { ObjectId } from 'mongodb';

@Injectable()
export class MongoChatHistoryService extends MongoDBChatMessageHistory {
  constructor(
    @Inject('COLLECTION_NAME') collection: string,
    sessionId: string,
  ) {
    super();
    this.collection = collection;
    this.sessionId = new ObjectId().toString();
  }
}
