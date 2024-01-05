import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseMessage } from '@langchain/core/messages';

export type MongoDBChatMessageHistoryDocument = MongoChatHistory & Document;

@Schema()
export class MongoChatHistory {
  @Prop()
  sessionId: string;

  @Prop()
  messages: BaseMessage[];
}

export const MongoChatHistorySchema =
  SchemaFactory.createForClass(MongoChatHistory);
