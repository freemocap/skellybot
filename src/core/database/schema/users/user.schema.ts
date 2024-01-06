import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @ApiProperty()
  @Prop({})
  type: string;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  uuid: string;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  id: string;

  @ApiProperty()
  @Prop({ unique: true })
  discordId: string;

  // TODO - Implement Slack Id
  // @ApiProperty()
  // @Prop()
  // slackId: string;

  @ApiProperty()
  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
