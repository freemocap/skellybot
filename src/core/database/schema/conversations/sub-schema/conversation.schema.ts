import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Couplet, CoupletSchema } from './couplet.schema';

@Schema()
export class Conversation {
  @Prop({ type: String, required: true })
  owner: {
    id: string;
    username: string;
    identifier: string;
  };

  @Prop({ type: [CoupletSchema], required: true })
  couplets: Couplet[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
