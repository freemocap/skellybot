import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ContextRoute } from '../ai-chats/context-route.provider';

export class CreateMessageDto {
  @IsNotEmpty()
  messageId: string;

  @IsEnum(['human', 'ai', 'system'])
  speakerType: string;

  // TODO - This probably shouldn't be optional, but I don't want to break anything with the Database right now
  // TODO - This should probably be a UserIdentifier or something (or maybe a SpeakerIdentifier? Which can be like a UserIdentifier that can be non-human?)
  @IsOptional()
  speakerId: string;

  @IsEnum(['discord', 'slack'])
  interfaceSource: string;

  @IsOptional()
  content: string;

  @IsOptional()
  attachmentText: string;

  @IsNotEmpty()
  contextRoute: ContextRoute;

  @IsDateString()
  messageSentTimestamp: Date;

  @IsObject()
  metadata: Record<string, unknown>;
}
