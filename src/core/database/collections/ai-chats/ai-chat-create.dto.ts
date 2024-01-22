import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContextRoute } from './context-route.provider';
import { UserIdentifier } from '../users/user-identifiers';
import { Couplet } from '../couplets/couplet.schema';

export class AiChatCreateDto {
  @IsString()
  @IsNotEmpty()
  aiChatId: string;

  @ValidateNested()
  @Type(() => UserIdentifier)
  ownerUser: UserIdentifier;

  @ValidateNested()
  @Type(() => ContextRoute)
  contextRoute: ContextRoute;

  @IsString()
  @IsOptional()
  contextInstructions: string;

  @ValidateNested({ each: true })
  @Type(() => Couplet)
  couplets: Couplet[];
}

export class UpdateAiChatDto {
  @ValidateNested({ each: true })
  @Type(() => Couplet)
  couplets: Couplet[];
}

export class GetAiChatDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class ListAiChatsDto {
  @ValidateNested()
  @Type(() => ContextRoute)
  contextRoute: ContextRoute;
}
