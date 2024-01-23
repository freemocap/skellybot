import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Message } from 'discord.js';
import { ContextRoute } from '../ai-chats/context-route.provider';

export type CoupletDocument = Couplet & Document;

@Schema({ timestamps: true })
export class Couplet {
  // TODO - This probably shouldn't be optional, but I don't want to break anything with the Database right now
  @Prop()
  initialExchange: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  humanMessage: Message;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  aiResponse: Message;

  @Prop({ type: ContextRoute })
  contextRoute: ContextRoute;
}

export const CoupletSchema = SchemaFactory.createForClass(Couplet);
