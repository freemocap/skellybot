import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  uuid: string;

  @Prop({ required: true })
  favoriteColor: string;

  @Prop({ unique: true })
  discordId: string;

  @Prop({ unique: true })
  slackId: string;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);

function validateFavoriteColor(color: string) {
  const regex = /^([A-Fa-f0-9]{6})$/;
  return regex.test(`${color}`);
}

UserSchema.pre<User>('save', function (next) {
  if (!validateFavoriteColor(this.favoriteColor)) {
    throw new Error(
      'User.favoriteColor should be a valid 6 digit hex color code (e.g. FF00FF)',
    );
  }
  next();
});
