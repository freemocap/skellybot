import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Couplet, CoupletSchema } from './couplet.schema';
import { Identifier } from '../../users/sub-schema/identifiersSchema';
import { ContextRoute } from './context-route.schema';
export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, unique: true })
  id: string; // the id should match the bottom-most/last identifier in the context route

  @Prop({ type: Identifier, required: true })
  owner: Identifier;

  @Prop({ type: ContextRoute, required: true })
  contextRoute: ContextRoute;

  @Prop({ type: [CoupletSchema], required: true })
  couplets: Couplet[];

  validateId() {
    const lastIdentifier =
      this.contextRoute.identifiers[this.contextRoute.identifiers.length - 1];
    if (this.id !== lastIdentifier.id) {
      throw new Error(
        'Id should match the bottom-most identifier in the context route',
      );
    }
  }
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.post('save', function (doc: ConversationDocument) {
  const lastIdentifier =
    doc.contextRoute.identifiers[doc.contextRoute.identifiers.length - 1];
  if (doc.id !== lastIdentifier.id) {
    throw new Error(
      'Id should match the bottom-most identifier in the context route',
    );
  }
});
