import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Validate } from 'class-validator';

@Schema()
export class Identifier {
  @Prop({ type: String, required: false })
  id?: string;

  @Prop({ type: String, required: false })
  name?: string;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;
}

@Schema()
export class DiscordIdentifier extends Identifier {}

export const DiscordIdentifierSchema =
  SchemaFactory.createForClass(DiscordIdentifier);

@Schema()
export class SlackIdentifier extends Identifier {}

export const SlackIdentifierSchema =
  SchemaFactory.createForClass(SlackIdentifier);

@Schema()
export class Identifiers {
  @Prop({ type: DiscordIdentifierSchema, required: false })
  discord?: DiscordIdentifier;

  @Prop({ type: SlackIdentifierSchema, required: false })
  slack?: SlackIdentifier;

  @Validate(
    (identifiers: Identifiers) => {
      return Boolean(identifiers.discord || identifiers.slack);
    },
    { message: 'At least one of Discord or Slack identifier is required.' },
  )
  isAtLeastOneIdentifierProvided: boolean;
}

export const IdentifiersSchema = SchemaFactory.createForClass(Identifiers);
