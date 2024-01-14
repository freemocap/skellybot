import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsUUID } from 'class-validator';
import { UserIdentifiers } from './identifiers.utility';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  @IsUUID()
  uuid: string;

  @Prop({ type: UserIdentifiers })
  identifiers: UserIdentifiers;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
