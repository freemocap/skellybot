import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Identifier } from '../users/sub-schema/identifiersSchema';
import { ContextRoute } from './context-route.provider';

export type ConversationDocument = Conversation & Document;

class Message {
  @Prop({ required: true })
  messageAuthor: string;

  @Prop({ required: true, enum: ['human', 'ai', 'system'] })
  speakerType: string;

  @Prop({ required: true, enum: ['discord', 'slack'] })
  interfaceSource: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

class HumanMessage extends Message {
  @Prop({ required: true, enum: ['human', 'ai', 'system'] })
  speakerType: 'human';
}

class AiMessage extends Message {
  @Prop({ required: true, enum: ['human', 'ai', 'system'] })
  speakerType: 'ai';
}

class Couplet {
  @Prop({ type: Message, required: true })
  humanMessage: HumanMessage;

  @Prop({ type: Message, required: true })
  aiMessage: AiMessage;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, unique: true })
  conversationId: string;

  @Prop({ type: Identifier, required: true })
  owner: Identifier;

  @Prop({ type: ContextRoute, required: true })
  contextRoute: ContextRoute;

  @Prop({ type: [Couplet], required: true })
  couplets: Couplet[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.post(
  'save',
  function (doc: ConversationDocument, next: (err?: Error) => void) {
    const lastIdentifier =
      doc.contextRoute.identifiers[doc.contextRoute.identifiers.length - 1];
    if (doc.conversationId !== lastIdentifier.id) {
      next(
        new Error(
          'conversationId should match the bottom-most identifier in the context route',
        ),
      );
    } else {
      next();
    }
  },
);
