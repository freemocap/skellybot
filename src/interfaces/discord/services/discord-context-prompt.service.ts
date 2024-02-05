import { Injectable, Logger } from '@nestjs/common';
import {
  CategoryChannel,
  Collection,
  DMChannel,
  Guild,
  GuildBasedChannel,
  GuildEmoji,
  Message,
  ReactionEmoji,
  TextChannel,
  ThreadChannel,
} from 'discord.js';

@Injectable()
export class DiscordContextPromptService {
  private readonly logger = new Logger(DiscordContextPromptService.name);
  oldInstructionsChannelPattern = new RegExp('.*bot-instructions.*', 'i');
  instructionsChannelPattern = new RegExp('.*🤖-?prompt-?settings.*', 'i');
  botPromptEmoji = '🤖';

  async getContextPromptFromMessage(message: Message) {
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
      const channelPinnedInstructions =
        await this._getPinnedInstructions(channel);
      const categoryInstructions = await this.getInstructions(
        server,
        channel.parent as CategoryChannel,
      );
      const serverInstructions = await this.getInstructions(server, null);
      return [
        serverInstructions,
        categoryInstructions,
        channelTopic,
        channelPinnedInstructions,
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
      const botConfigChannel = (await this.getOrCreatePromptChannel(
        server,
        category,
      )) as TextChannel;

      if (!botConfigChannel) {
        return '';
      }
      return await this._getBotReactionMessages(botConfigChannel);
    } catch (error) {
      this.logger.error(`Failed to get instructions: ${error.message}`);
      return ''; // In case of an error, return an empty string to keep the chatbot operational.
    }
  }

  public async getOrCreatePromptChannel(
    server: Guild,
    category: CategoryChannel,
  ) {
    // @ts-expect-error
    const channels: Collection<string, GuildBasedChannel> =
      await server.channels.fetch(null, {
        force: true,
      });

    // find channels that match the categoryID and either the old or new bot-instructions channel pattern
    const botConfigChannel = channels.find(
      (ch) =>
        ch.parentId === category.id &&
        (this.instructionsChannelPattern.test(ch.name) ||
          this.oldInstructionsChannelPattern.test(ch.name)),
    );

    if (!botConfigChannel) {
      this.logger.debug(
        `No bot-instructions channel found in category: ${category?.name} - creating one now...`,
      );
      return await category.children.create({
        name: this.getDefaultBotChannelName() as string,
        topic: `Bot instructions for this category! Messages tagged with ${this.botPromptEmoji} will be used as context prompts for the chatbot.`,
        position: 0,
      });
    }
    return botConfigChannel;
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

  public isBotInstructionEmoji(emoji: GuildEmoji | ReactionEmoji): boolean {
    // Ensure emoji.name is not `null` before comparison
    return emoji.name === this.botPromptEmoji;
  }

  public getDefaultBotChannelName() {
    const botChannelName = '🤖-Prompt-Settings';
    if (!this.instructionsChannelPattern.test(botChannelName)) {
      throw new Error(
        `The bot channel name does not match the expected pattern: ${botChannelName}`,
      );
    }
    return botChannelName;
  }

  private async _getPinnedInstructions(channel: TextChannel) {
    const pinnedMessages = await channel.messages.fetchPinned();
    if (pinnedMessages.size === 0) {
      return '';
    }
    let pinnedMessagesContent = 'BEGIN PINNED MESSAGES\n\n';
    let pinnedMessageCount = 0;
    for (const message of pinnedMessages.values()) {
      pinnedMessagesContent += `Pinned message ${pinnedMessageCount++}:\n`;
      pinnedMessagesContent += message.content + '\n';
    }
    pinnedMessagesContent += '\nEND PINNED MESSAGES';
    return pinnedMessagesContent;
  }
}
