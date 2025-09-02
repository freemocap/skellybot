import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ContextRoute } from './context-route.provider';
import { User } from '../users/user.schema';
import { Couplet } from '../couplets/couplet.schema';

export type AiChatDocument = AiChat & Document;

@Schema({ timestamps: true })
export class AiChat {
  @Prop({ required: true, unique: true })
  aiChatId: string;

  // Original nested structure - kept for backwards compatibility
  @Prop({ type: ContextRoute, required: true })
  contextRoute: ContextRoute;

  @Prop()
  contextInstructions: string;

  @Prop()
  modelName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerUser: User;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Couplet' }], required: true })
  couplets: Couplet[];

  // === NEW FLATTENED FIELDS FOR EASIER QUERYING ===

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
}

export const AiChatSchema = SchemaFactory.createForClass(AiChat);

// Keep the existing validation
AiChatSchema.post(
  'save',
  function (doc: AiChatDocument, next: (err?: Error) => void) {
    const lastIdentifier =
      doc.contextRoute.identifiers[doc.contextRoute.identifiers.length - 1];
    if (doc.aiChatId !== lastIdentifier.contextId) {
      next(
        new Error(
          'aiChatId should match the bottom-most identifier in the context route',
        ),
      );
    } else {
      next();
    }
  },
);

// Add compound indexes for common query patterns
AiChatSchema.index({ ownerUser: 1, serverId: 1, channelId: 1 });
AiChatSchema.index({ serverId: 1, channelId: 1, createdAt: -1 });
AiChatSchema.index({ channelId: 1, createdAt: -1 });
