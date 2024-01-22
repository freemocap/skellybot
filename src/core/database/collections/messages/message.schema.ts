import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ContextRoute } from '../ai-chats/context-route.provider';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true, enum: ['human', 'ai', 'system'] })
  speakerType: string;

  @Prop({ required: true, enum: ['discord', 'slack'] })
  interfaceSource: string;

  @Prop({ required: false })
  content: string;

  @Prop({ required: false })
  attachmentText: string;

  @Prop({ required: true })
  messageSentTimestamp: Date;

  @Prop({ required: true, type: ContextRoute })
  contextRoute: ContextRoute;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
