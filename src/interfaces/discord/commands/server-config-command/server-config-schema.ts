import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsArray,
  IsBoolean,
  validateOrReject,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';
import { ColorResolvable } from 'discord.js';

export class DiscordPermissionsOverwrites {
  @IsString()
  roleName: string;

  @IsArray()
  @IsOptional()
  allow?: string[];

  @IsArray()
  @IsOptional()
  deny?: string[];
}

export class DiscordCategoryConfig {
  @IsString()
  name: string;

  @ValidateNested({ each: true })
  @Type(() => DiscordPermissionsOverwrites)
  @IsArray()
  @IsOptional()
  permissionsOverwrites?: DiscordPermissionsOverwrites[];

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  botPromptMessages?: string[];
}

export class DiscordRoleConfig {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  syncPermissionsWithRole?: string;

  @IsOptional()
  color?: ColorResolvable;

  @IsBoolean()
  hoist: boolean = false;
}

export class DiscordTextChannelConfig {
  @IsString()
  name: string;

  @IsString()
  type: 'text' | 'forum';

  @ValidateNested({ each: true })
  @Type(() => DiscordPermissionsOverwrites)
  @IsArray()
  @IsOptional()
  permissionsOverwrites?: DiscordPermissionsOverwrites[];

  @IsString()
  @IsOptional()
  parentCategory?: string | null;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class DiscordMessageConfig {
  @IsString()
  content: string;

  @IsString()
  channelName: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  reactions?: string[];
}

export class DiscordMemberConfig {
  @IsString()
  username: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  roles?: string[];

  @IsString()
  @IsOptional()
  nickname?: string;
}

export class DiscordServerConfig {
  @ValidateNested({ each: true })
  @Type(() => DiscordCategoryConfig)
  @IsArray()
  @IsOptional()
  categories?: DiscordCategoryConfig[];

  @ValidateNested({ each: true })
  @Type(() => DiscordMemberConfig)
  @IsArray()
  @IsOptional()
  members?: DiscordMemberConfig[];

  @ValidateNested({ each: true })
  @Type(() => DiscordRoleConfig)
  @IsArray()
  @IsOptional()
  roles?: DiscordRoleConfig[];

  @ValidateNested({ each: true })
  @Type(() => DiscordTextChannelConfig)
  @IsArray()
  @IsOptional()
  channels?: DiscordTextChannelConfig[];

  @ValidateNested({ each: true })
  @Type(() => DiscordMessageConfig)
  @IsArray()
  @IsOptional()
  messages?: DiscordMessageConfig[];
}

export async function validateServerConfig(configObjectFromJson: any) {
  const config = plainToInstance(DiscordServerConfig, configObjectFromJson);
  try {
    await validateOrReject(config);
    console.log('Config is valid!');
    return { isValid: true, config, errors: [] };
  } catch (errors) {
    console.log('Config validation failed:', errors);
    return { isValid: false, config, errors };
  }
}
