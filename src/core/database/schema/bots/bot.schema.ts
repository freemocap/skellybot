import { RunnableSequence } from 'langchain/runnables';
import { BaseMemory } from '@langchain/core/memory';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class Bot {
  @Prop({ type: User, required: true })
  ownerId: string;

  @Prop({ required: true, unique: true })
  botId: string;

  @Prop({ type: Map, of: String, required: true })
  contextRoute: Record<string, string>;

  @Prop({ required: true })
  chain: RunnableSequence<any, any>;

  @Prop()
  memory?: BaseMemory;
}
export const BotSchema = SchemaFactory.createForClass(Bot);
