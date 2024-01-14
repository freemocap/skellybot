import { Injectable } from '@nestjs/common';
import { ReactionEmoji, TextChannel, ThreadChannel } from 'discord.js';
import { DiscordContextRouteFactory } from '../../../core/database/collections/ai-chats/context-route.provider';

@Injectable()
export class DiscordContextService {
  getContextRoute(channel: TextChannel, thread?: ThreadChannel) {
    // TODO - Handle Direct Messages
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
  }

  async getContextInstructions(channel: TextChannel) {
    const channelInstructions = channel.topic || '';
    const categoryInstructions = await this.getCategoryInstructions(channel);
    const serverInstructions = await this.getServerInstructions(channel);
    return [serverInstructions, categoryInstructions, channelInstructions].join(
      '\n\n',
    );
  }

  private async getCategoryInstructions(channel: TextChannel): Promise<string> {
    const category = channel.parent;
    if (!category) {
      return '';
    }
    const categoryChannels = channel.guild.channels.cache.filter(
      (ch) => ch.parentId === channel.parentId,
    );

    const botConfigChannel = categoryChannels.find((ch) =>
      /bot-config.*?/i.test(ch.name),
    ) as TextChannel | undefined;
    if (!botConfigChannel) {
      return '';
    }

    const messages = await botConfigChannel.messages.fetch({ limit: 100 });

    const instructionMessages = messages.filter((message) =>
      message.reactions.cache.some((reaction) =>
        // @ts-ignore
        this.isBotInstructionEmoji(reaction.emoji),
      ),
    );

    const instructions = instructionMessages
      .map((message) => message.content)
      .join('\n');

    return instructions;
  }

  private async getServerInstructions(channel: TextChannel): Promise<string> {
    if (!channel.guild) {
      return '';
    }
    const topLevelChannels = channel.guild.channels.cache.filter(
      (ch) => !ch.parent, // only get channels that are not in a category
    );

    const botConfigChannel = topLevelChannels.find((ch) =>
      /bot-config.*?/i.test(ch.name),
    ) as TextChannel | undefined;
    if (!botConfigChannel) {
      return '';
    }

    const messages = await botConfigChannel.messages.fetch({ limit: 100 });

    const instructionMessages = messages.filter((message) =>
      message.reactions.cache.some((reaction) =>
        // @ts-ignore
        this.isBotInstructionEmoji(reaction.emoji),
      ),
    );

    const instructions = instructionMessages
      .map((message) => message.content)
      .join('\n');

    return instructions;
  }
  private isBotInstructionEmoji(emoji: ReactionEmoji): boolean {
    return emoji.name === '🤖';
  }
}
