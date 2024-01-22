import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  Guild,
  GuildEmoji,
  Message,
  ReactionEmoji,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { DiscordContextRouteFactory } from '../../../core/database/collections/ai-chats/context-route.provider';

@Injectable()
export class DiscordContextService {
  private readonly logger = new Logger(DiscordContextService.name);
  instructionsChannelPattern = new RegExp('bot-instructions.*', 'i');

  getContextRoute(channel: TextChannel, thread?: ThreadChannel) {
    // TODO - Handle Direct Messages
    try {
      return DiscordContextRouteFactory.create(
        false,
        {
          type: 'channel',
          contextId: channel.id,
          contextName: channel.name,
        },
        {
          type: 'server',
          contextId: channel.guild?.id,
          contextName: channel.guild?.name,
        },
        {
          type: 'category',
          contextId: channel?.parentId,
          contextName: channel.parent?.name,
        },
        {
          type: 'thread',
          contextId: thread?.id,
          contextName: thread?.name,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to get context route: ${error.message}`);
      throw error;
    }
  }

  async getContextInstructions(channel: TextChannel) {
    try {
      const server = await channel.client.guilds.fetch(channel.guildId);
      const channelInstructions = channel.topic || '';
      const categoryInstructions = await this.getInstructions(
        server,
        channel.parentId,
      );
      const serverInstructions = await this.getInstructions(server, null);
      return [
        serverInstructions,
        categoryInstructions,
        channelInstructions,
      ].join('\n\n');
    } catch (error) {
      this.logger.error(
        `Failed to get context instructions: ${error.message} - returning empty string!`,
      );
      throw error;
    }
  }

  private async getInstructions(
    server: Guild,
    categoryId: string | null,
  ): Promise<string> {
    try {
      const channels = server.channels.cache.filter(
        (ch) => ch.parentId === categoryId && ch.type === ChannelType.GuildText,
      );

      const botConfigChannel = channels.find((ch) =>
        this.instructionsChannelPattern.test(ch.name),
      ) as TextChannel | undefined;

      if (!botConfigChannel) {
        return '';
      }

      const messages = await botConfigChannel.messages.fetch({ limit: 100 });

      const instructionMessages = messages.filter((message: Message) =>
        message.reactions.cache.some((reaction) =>
          this.isBotInstructionEmoji(reaction.emoji),
        ),
      );

      return instructionMessages
        .map((message: Message) => message.content)
        .join('\n');
    } catch (error) {
      this.logger.error(`Failed to get instructions: ${error.message}`);
      return ''; // In case of an error, return an empty string to keep the bot operational.
    }
  }

  private isBotInstructionEmoji(emoji: GuildEmoji | ReactionEmoji): boolean {
    // Ensure emoji.name is not `null` before comparison
    return emoji.name === '🤖';
  }
}
