import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ContextRoute } from '../ai-chats/context-route.provider';
import { Message } from '../messages/message.schema';

export type CoupletDocument = Couplet & Document;

@Schema({ timestamps: true })
export class Couplet {
  // TODO - This probably shouldn't be optional, but I don't want to break anything with the Database right now
  @Prop()
  initialExchange: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  humanMessage: Message;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  aiResponse: Message;

  // Original nested structure - kept for backwards compatibility
  @Prop({ type: ContextRoute })
  contextRoute: ContextRoute;

  // === NEW FLATTENED FIELDS FOR EASIER QUERYING ===

  // Top-level source interface for quick filtering
  @Prop({ required: false, enum: ['discord', 'slack'], index: true })
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
}

export const CoupletSchema = SchemaFactory.createForClass(Couplet);

// Add compound indexes for common query patterns
CoupletSchema.index({ channelId: 1, createdAt: -1 });
CoupletSchema.index({ serverId: 1, channelId: 1, createdAt: -1 });
