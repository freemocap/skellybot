import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  id: string;

  @Prop()
  name: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
