import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsUUID } from 'class-validator';
import { UserIdentifiers } from './user-identifiers';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  @IsUUID()
  uuid: string;

  // Original nested structure - kept for backwards compatibility
  @Prop({ type: UserIdentifiers })
  identifiers: UserIdentifiers;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;

  // === NEW FLATTENED FIELDS FOR EASIER QUERYING ===

  // Discord identifiers flattened
  @Prop({ required: false, index: true, sparse: true })
  discordId: string;

  @Prop({ required: false })
  discordUsername: string;

  // Slack identifiers flattened
  @Prop({ required: false, index: true, sparse: true })
  slackId: string;

  @Prop({ required: false })
  slackUsername: string;

  // Track which platforms the user is on
  @Prop({ type: [String], enum: ['discord', 'slack'], index: true })
  platforms: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add compound indexes for common query patterns
UserSchema.index({ discordId: 1, createdAt: -1 });
UserSchema.index({ slackId: 1, createdAt: -1 });
UserSchema.index({ platforms: 1 });

// Ensure unique discord and slack IDs (sparse allows multiple nulls)
UserSchema.index({ discordId: 1 }, { unique: true, sparse: true });
UserSchema.index({ slackId: 1 }, { unique: true, sparse: true });
