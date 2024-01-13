import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsUUID } from 'class-validator';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  @IsUUID()
  uuid: string;

  @Prop({ type: Object })
  identifiers?: {
    discord?: {
      id: string;
      username: string;
    };
    slack?: {
      id: string;
      username: string;
    };
  };

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
