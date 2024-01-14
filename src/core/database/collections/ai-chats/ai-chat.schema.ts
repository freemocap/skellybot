import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ContextRoute } from './context-route.provider';
import { User } from '../users/user.schema';
import { Couplet } from '../couplets/couplet.schema';

export type AiChatDocument = AiChat & Document;

@Schema({ timestamps: true })
export class AiChat {
  @Prop({ type: ContextRoute, required: true })
  contextRoute: ContextRoute;

  @Prop({ required: true, unique: true })
  aiChatId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerUser: User;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Couplet' }], required: true })
  couplets: Couplet[];
}

export const AiChatSchema = SchemaFactory.createForClass(AiChat);

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
