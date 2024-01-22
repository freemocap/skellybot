import { IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UserIdentifier {
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class DiscordIdentifier extends UserIdentifier {}

export class SlackIdentifier extends UserIdentifier {}

export class UserIdentifiers {
  @IsOptional()
  discord?: DiscordIdentifier;

  @IsOptional()
  slack?: SlackIdentifier;

  @ValidateIf(
    (identifiers: UserIdentifiers) =>
      Boolean(identifiers.discord || identifiers.slack),
    { message: 'At least one of Discord or Slack identifier is required.' },
  )
  isAtLeastOneIdentifierProvided: boolean;
}
