import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Memory {
  @Prop()
  sessionId: string;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);
