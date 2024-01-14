import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContextRoute } from '../context-route.provider';
import { Identifier } from '../../users/sub-schema/identifiers.schema';

class MessageDto {
  @IsString()
  @IsNotEmpty()
  messageAuthor: string;

  @IsString()
  @IsNotEmpty()
  interfaceSource: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  timestamp: Date;

  metadata: Record<string, unknown>;
}

class CoupletDto {
  @ValidateNested()
  @Type(() => MessageDto)
  humanMessage: MessageDto;

  @ValidateNested()
  @Type(() => MessageDto)
  aiMessage: MessageDto;
}

export class ConversationDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ValidateNested()
  @Type(() => Identifier)
  ownerUser: Identifier;

  @ValidateNested()
  @Type(() => ContextRoute)
  contextRoute: ContextRoute;

  @ValidateNested({ each: true })
  @Type(() => CoupletDto)
  couplets: CoupletDto[];
}

export class UpdateConversationDto {
  @ValidateNested({ each: true })
  @Type(() => CoupletDto)
  couplets: CoupletDto[];
}

export class GetConversationDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class ListConversationsDto {
  @ValidateNested()
  @Type(() => ContextRoute)
  contextRoute: ContextRoute;
}
