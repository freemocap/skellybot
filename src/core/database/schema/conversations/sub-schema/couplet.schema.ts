import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  AiMessage,
  AiMessageSchema,
  HumanMessage,
  HumanMessageSchema,
} from './message.schema';

@Schema()
export class Couplet {
  @Prop({ type: HumanMessageSchema, required: true })
  humanMessage: HumanMessage;

  @Prop({ type: AiMessageSchema, required: true })
  aiMessage: AiMessage;
}

export const CoupletSchema = SchemaFactory.createForClass(Couplet);
