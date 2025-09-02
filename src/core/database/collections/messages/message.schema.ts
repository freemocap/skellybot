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

  // TODO - This probably shouldn't be optional, but I don't want to break anything with the Database right now
  @Prop({ required: false })
  speakerId: string;

  @Prop({ required: true, enum: ['discord', 'slack'] })
  interfaceSource: string;

  @Prop({ required: false })
  content: string;

  @Prop({ required: false })
  attachmentText: string;

  @Prop({ required: true })
  messageSentTimestamp: Date;

  // Original nested structure - kept for backwards compatibility
  @Prop({ required: true, type: ContextRoute })
  contextRoute: ContextRoute;

  // === 2025-09-02 - ADDED FLATTENED FIELDS FOR EASIER QUERYING ===

  // Top-level source interface for quick filtering
  @Prop({ required: true, enum: ['discord', 'slack'], index: true })
  sourceInterface: string;

  // Flattened context IDs for easy querying
  @Prop({ required: false, index: true })
  serverId: string;

  @Prop({ required: false })
  serverName: string;

  @Prop({ required: false, index: true })
  categoryId: string;

  @Prop({ required: false })
  categoryName: string;

  @Prop({ required: false, index: true })
  channelId: string;

  @Prop({ required: false })
  channelName: string;

  @Prop({ required: false, index: true })
  threadId: string;

  @Prop({ required: false })
  threadName: string;

  @Prop({ required: false, index: true })
  isDirectMessage: boolean;

  // Compound index for common query patterns
  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Add compound indexes for common query patterns
MessageSchema.index({ speakerId: 1, serverId: 1, channelId: 1 });
MessageSchema.index({ serverId: 1, channelId: 1, messageSentTimestamp: -1 });
MessageSchema.index({ channelId: 1, messageSentTimestamp: -1 });
