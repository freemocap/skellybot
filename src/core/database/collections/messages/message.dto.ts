import { IsEnum, IsNotEmpty, IsObject, IsDateString } from 'class-validator';
import { ContextRoute } from '../ai-chats/context-route.provider';

export class CreateMessageDto {
  @IsNotEmpty()
  messageId: string;

  @IsEnum(['human', 'ai', 'system'])
  speakerType: string;

  @IsEnum(['discord', 'slack'])
  interfaceSource: string;

  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  contextRoute: ContextRoute;

  @IsDateString()
  messageSentTimestamp: Date;

  @IsObject()
  metadata: Record<string, unknown>;
}
