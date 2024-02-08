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
import { ColorResolvable, PermissionsBitField } from 'discord.js';

export class DiscordPermissionsOverwrites {
  @IsString()
  roleName: string;

  @IsArray()
  @IsOptional()
  allow?: string[];

  @IsArray()
  @IsOptional()
  deny?: string[];

  public permissionsAsBitFields() {
    const allowBitFields: bigint[] = [];
    const denyBitFields: bigint[] = [];
    if (this.allow) {
      for (const permission of this.allow) {
        switch (permission) {
          case 'VIEW_CHANNEL':
            allowBitFields.push(PermissionsBitField.Flags.ViewChannel);
            break;
          case 'SEND_MESSAGES':
            allowBitFields.push(PermissionsBitField.Flags.SendMessages);
            break;
          case 'READ_MESSAGE_HISTORY':
            allowBitFields.push(PermissionsBitField.Flags.ReadMessageHistory);
            break;
          case 'MANAGE_CHANNELS':
            allowBitFields.push(PermissionsBitField.Flags.ManageChannels);
            break;
          case 'CREATE_PUBLIC_THREADS':
            allowBitFields.push(PermissionsBitField.Flags.CreatePublicThreads);
            break;
          case 'SEND_MESSAGES_IN_THREADS':
            allowBitFields.push(
              PermissionsBitField.Flags.SendMessagesInThreads,
            );
            break;
          case 'SEND_VOICE_MESSAGES':
            allowBitFields.push(PermissionsBitField.Flags.SendVoiceMessages);
            break;
          default:
            throw new Error(`Unknown permission: ${permission}`);
        }
      }
    }
    if (this.deny) {
      for (const permission of this.deny) {
        switch (permission) {
          case 'VIEW_CHANNEL':
            denyBitFields.push(PermissionsBitField.Flags.ViewChannel);
            break;
          case 'SEND_MESSAGES':
            denyBitFields.push(PermissionsBitField.Flags.SendMessages);
            break;
          case 'READ_MESSAGE_HISTORY':
            denyBitFields.push(PermissionsBitField.Flags.ReadMessageHistory);
            break;
          case 'MANAGE_CHANNELS':
            denyBitFields.push(PermissionsBitField.Flags.ManageChannels);
            break;
          case 'CREATE_PUBLIC_THREADS':
            denyBitFields.push(PermissionsBitField.Flags.CreatePublicThreads);
            break;
          case 'SEND_MESSAGES_IN_THREADS':
            denyBitFields.push(PermissionsBitField.Flags.SendMessagesInThreads);
            break;
          case 'SEND_VOICE_MESSAGES':
            denyBitFields.push(PermissionsBitField.Flags.SendVoiceMessages);
            break;
          default:
            throw new Error(`Unknown permission: ${permission}`);
        }
      }
    }
    return { allow: allowBitFields, deny: denyBitFields };
  }
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
