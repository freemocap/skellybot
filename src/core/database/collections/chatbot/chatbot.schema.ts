import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RunnableSequence } from 'langchain/runnables';

export type ChatbotDocument = Chatbot & Document;

@Schema({ timestamps: true })
export class Chatbot {
  @Prop({ required: true })
  chatbotId: string;

  @Prop({ required: true, type: Object })
  chain: RunnableSequence<any, any>;

  @Prop({ required: true, type: Object })
  memory: any;
}

export const ChatbotSchema = SchemaFactory.createForClass(Chatbot);
