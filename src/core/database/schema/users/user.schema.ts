import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  uuid: string;

  @Prop({ type: Object })
  identifiers: Record<string, string>;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
