import { IS_UUID, IsOptional, IsString, IsUUID } from 'class-validator';

class DiscordIdentifierDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  username?: string;
}

class SlackIdentifierDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  username?: string;
}

export class UserDto {
  @IsOptional()
  identifiers?: {
    discord?: DiscordIdentifierDto;
    slack?: SlackIdentifierDto;
  };

  @IsOptional()
  metadata?: Record<string, unknown>;
}
