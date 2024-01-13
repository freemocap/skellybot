import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Couplet, CoupletSchema } from './couplet.schema';
import { Identifier } from '../../users/sub-schema/identifiersSchema';
import { ContextRoute } from './context-route.schema';

@Schema()
export class Conversation {
  @Prop({ type: Identifier, required: true })
  owner: Identifier;

  @Prop({ type: ContextRoute, required: true })
  contextRoute: ContextRoute;

  @Prop({ type: [CoupletSchema], required: true })
  couplets: Couplet[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
