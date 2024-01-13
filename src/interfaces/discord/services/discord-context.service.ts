import { Injectable, LoggerService } from '@nestjs/common';
import { Message } from 'discord.js';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty, ValidateIf } from 'class-validator';
import {
  ContextIdentifier,
  ContextRoute,
} from '../../../core/database/schema/conversations/sub-schema/context-route.schema';
import { Model } from 'mongoose';

@Schema()
export class DiscordThreadContextRoute extends ContextRoute {
  @Prop({ required: true, type: ContextIdentifier })
  @IsNotEmpty()
  server?: ContextIdentifier;

  @Prop({ type: ContextIdentifier })
  @ValidateIf((o) => o.isDirectMessage === false)
  category?: ContextIdentifier;

  @Prop({ type: ContextIdentifier })
  @IsNotEmpty()
  channel: ContextIdentifier;

  @Prop({ type: ContextIdentifier })
  @ValidateIf((o) => o.isDirectMessage === false)
  thread?: ContextIdentifier;

  @Prop()
  @IsNotEmpty()
  isDirectMessage: boolean; // if true, then the server, category, and thread properties will be null
}

export const DiscordThreadContextRouteSchema = SchemaFactory.createForClass(
  DiscordThreadContextRoute,
);

@Injectable()
export class DiscordContextService {
  constructor(
    private readonly _logger: LoggerService,
    @InjectModel(ContextRoute.name)
    private readonly _contextRouteModel: Model<DiscordThreadContextRoute>,
  ) {}

  public async createContext(message: Message): Promise<void> {
    try {
      const contextRoute = new this._contextRouteModel({
        server: { id: message.guild?.id, name: message.guild?.name },
        category: {
          // @ts-ignore
          id: message.channel.parent?.id,
          // @ts-ignore
          name: message.channel.parent?.name,
        },
        // @ts-ignore
        channel: { id: message.channel.id, name: message.channel.name },
        thread: { id: message.thread?.id, name: message.thread?.name },
        // @ts-ignore
        isDirectMessage: message.channel.type === 'dm',
      });

      this._logger.log(`Context created for message ${message.id}`);
    } catch (error) {
      this._logger.error(
        `Failed to create context for message ${message.id}: ${error.message}`,
      );
    }
  }
}
