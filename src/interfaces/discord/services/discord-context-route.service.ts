import { Injectable, Logger } from '@nestjs/common';
import {
  DMChannel,
  GuildChannel,
  Message,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { ContextRoute } from '../../../core/database/collections/ai-chats/context-route.provider';

@Injectable()
export class DiscordContextRouteService {
  private readonly logger = new Logger(DiscordContextRouteService.name);

  private _createRoute(
    isDirectMessage: boolean,
    channel: GuildChannel | DMChannel,
    thread?: ThreadChannel,
  ): ContextRoute {
    const identifiers = [];

    if (!isDirectMessage) {
      // Assuming channel is a TextChannel if it's not a DMChannel.
      const textChannel = channel as TextChannel;
      identifiers.push(
        {
          type: 'server',
          contextId: textChannel.guild.id,
          contextName: textChannel.guild.name,
        },
        {
          type: 'category',
          contextId: textChannel.parentId,
          contextName: textChannel.parent?.name,
        },
        {
          type: 'channel',
          contextId: textChannel.id,
          contextName: textChannel.name,
        },
      );
    }

    if (thread) {
      identifiers.push({
        type: 'thread',
        contextId: thread.id,
        contextName: thread.name,
      });
    }

    return new ContextRoute('discord', identifiers, isDirectMessage);
  }

  public getContextRoute(message: Message): ContextRoute {
    const isDirectMessage = message.channel instanceof DMChannel;
    if (isDirectMessage) {
      return this._createRoute(true, message.channel);
    }

    const isInThread = message.channel instanceof ThreadChannel;
    const threadChannel = isInThread
      ? (message.channel as ThreadChannel)
      : undefined;
    const parentChannel = isInThread
      ? threadChannel.parent
      : (message.channel as TextChannel);

    try {
      return this._createRoute(false, parentChannel, threadChannel);
    } catch (error) {
      this.logger.error(`Failed to get context route: ${error.message}`);
      throw error;
    }
  }
}
