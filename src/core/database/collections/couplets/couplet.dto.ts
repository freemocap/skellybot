import { IsOptional, ValidateNested } from 'class-validator';
import { Message } from '../messages/message.schema';
import { Prop } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ContextRoute } from '../ai-chats/context-route.provider';

export class CreateCoupletDto {
  @ValidateNested()
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  humanMessage: Message;

  @ValidateNested()
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  aiResponse: Message;

  @IsOptional()
  @ValidateNested()
  @Prop({ type: ContextRoute })
  contextRoute: ContextRoute;
}
