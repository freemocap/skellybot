import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsUUID } from 'class-validator';
import { Identifiers, IdentifiersSchema } from './identifiers.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  @IsUUID()
  uuid: string;

  @Prop({ type: IdentifiersSchema })
  identifiers: Identifiers;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
