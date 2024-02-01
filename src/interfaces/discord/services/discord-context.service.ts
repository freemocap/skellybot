import { Injectable, Logger } from '@nestjs/common';
import {
  CategoryChannel,
  ChannelType,
  DMChannel,
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

  getContextRoute(message: Message) {
    let channel: TextChannel | null;
    let thread: ThreadChannel | null;

    const isInThread = message.channel instanceof ThreadChannel;
    if (isInThread) {
      channel = message.channel.parent as TextChannel;
      thread = message.channel as ThreadChannel;
    } else {
      channel = message.channel as TextChannel;
      thread = null;
    }

    const isDirectMessage = message.channel instanceof DMChannel;
    try {
      return DiscordContextRouteFactory.create(
        isDirectMessage,
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

  async getContextInstructions(message: Message) {
    try {
      if (message.channel instanceof DMChannel) {
        return 'This is a direct message with the Human.';
      }
      let channel: TextChannel | null;
      if (message.channel instanceof ThreadChannel) {
        channel = message.channel.parent as TextChannel;
      } else {
        channel = message.channel as TextChannel;
      }
      const server = await channel.client.guilds.fetch(channel.guildId);
      const channelTopic = channel.topic || '';
      const channelInstructions = await this._getBotReactionMessages(channel);
      const categoryInstructions = await this.getInstructions(
        server,
        channel.parent as CategoryChannel,
      );
      const serverInstructions = await this.getInstructions(server, null);
      return [
        serverInstructions,
        categoryInstructions,
        channelTopic,
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
    category: CategoryChannel | null,
  ): Promise<string> {
    if (!category) {
      this.logger.debug(
        `Gathering 'top-level'/'server-wide' bot-instructions for server: ${server.name}`,
      );
    } else {
      this.logger.debug(
        `Gathering bot-instructions for category: '${category.name}' in server: '${server.name}'`,
      );
    }
    try {
      const channels = server.channels.cache.filter(
        (ch) =>
          ch.parent?.id === category?.id && ch.type === ChannelType.GuildText,
      );

      const botConfigChannel = channels.find((ch) =>
        this.instructionsChannelPattern.test(ch.name),
      ) as TextChannel | undefined;

      if (!botConfigChannel) {
        return '';
      }
      return await this._getBotReactionMessages(botConfigChannel);
    } catch (error) {
      this.logger.error(`Failed to get instructions: ${error.message}`);
      return ''; // In case of an error, return an empty string to keep the chatbot operational.
    }
  }

  private async _getBotReactionMessages(channel: TextChannel) {
    const messages = await channel.messages.fetch();

    const instructionMessages = messages.filter((message: Message) =>
      message.reactions.cache.some((reaction) =>
        this.isBotInstructionEmoji(reaction.emoji),
      ),
    );

    return instructionMessages
      .map((message: Message) => message.content)
      .join('\n');
  }

  private isBotInstructionEmoji(emoji: GuildEmoji | ReactionEmoji): boolean {
    // Ensure emoji.name is not `null` before comparison
    return emoji.name === '🤖';
  }
}
