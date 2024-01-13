import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Message {
  @Prop({ required: true })
  messageAuthor: string;

  @Prop({ required: true })
  interfaceSource: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

export type HumanMessageDocument = HumanMessage & Document;

@Schema()
export class HumanMessage extends Message {}

export const HumanMessageSchema = SchemaFactory.createForClass(HumanMessage);

@Schema()
export class AiMessage extends Message {}

export const AiMessageSchema = SchemaFactory.createForClass(AiMessage);
