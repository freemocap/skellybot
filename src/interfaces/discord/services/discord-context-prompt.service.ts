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
import { DiscordMessageService } from './discord-message.service';

@Injectable()
export class DiscordContextPromptService {
  private readonly logger = new Logger(DiscordContextPromptService.name);
  oldInstructionsChannelPattern = new RegExp('.*bot-instructions.*', 'i');
  instructionsChannelPattern = new RegExp('.*?prompt-?settings.*', 'i');
  botPromptEmoji = '🤖';

  constructor(private readonly _discordMessageService: DiscordMessageService) {}
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
      const channelTopic =
        `CHANNEL ${channel.name} TOPIC:\n\n${channel.topic}` || '';
      const channelPinnedInstructions =
        await this._getPinnedInstructions(channel);
      const categoryInstructions = await this.getCategoryInstructions(
        server,
        channel.parent as CategoryChannel,
      );
      const serverInstructions = await this.getServerInstructions(server);
      return [
        serverInstructions,
        categoryInstructions,
        channelTopic,
        channelPinnedInstructions,
      ].join('\n\n');
    } catch (error) {
      this.logger.error(
        `Failed to get context instructions with error: ${error}`,
      );
      throw error;
    }
  }

  private async getCategoryInstructions(
    server: Guild,
    category: CategoryChannel,
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
      const botConfigChannel = await this._getCategoryPromptChannel(
        server,
        category,
      );

      if (!botConfigChannel) {
        return '';
      }
      const instructions = await this._getBotReactionMessages(botConfigChannel);
      return `INSTRUCTIONS FOR CATEGORY: ${category.name}\n\n${instructions}`;
    } catch (error) {
      this.logger.error(`Failed to get instructions: ${error.message}`);
      throw new Error(
        `Failed to get instructions: ${error.message} ${error.stack}`,
      );
    }
  }

  private async getServerInstructions(server: Guild): Promise<string> {
    this.logger.debug(
      `Gathering 'top-level'/'server-wide' bot-instructions for server: ${server.name}`,
    );

    try {
      const botConfigChannel = await this._getServerPromptChannel(server);
      if (!botConfigChannel) {
        return '';
      }
      const instructions = await this._getBotReactionMessages(botConfigChannel);
      return `SERVER-WIDE INSTRUCTIONS FOR SERVER ${server.name}\n\n${instructions}\n\n`;
    } catch (error) {
      this.logger.error(`Failed to get instructions: ${error.message}`);
      throw new Error(
        `Failed to get instructions: ${error.message} ${error.stack}`,
      );
    }
  }

  public async createPromptChannel(
    category: CategoryChannel,
  ): Promise<GuildBasedChannel> {
    this.logger.debug(
      `Creating bot-instructions channel in category: ${category?.name} ...`,
    );
    return await category.children.create({
      name: this.getDefaultBotChannelName() as string,
      topic: `Bot instructions for this category! Messages tagged with ${this.botPromptEmoji} will be used as context prompts for the chatbot.`,
      position: 0,
    });
  }

  public async getOrCreatePromptChannel(
    server: Guild,
    category: CategoryChannel | null,
  ): Promise<GuildBasedChannel> {
    let botConfigChannel;
    if (category) {
      botConfigChannel = await this._getCategoryPromptChannel(server, category);
    } else {
      botConfigChannel = await this._getServerPromptChannel(server);
    }

    if (!botConfigChannel) {
      this.logger.debug(
        `No bot-instructions channel found in category: ${category?.name}`,
      );
      botConfigChannel = await this.createPromptChannel(category);
    }

    return botConfigChannel;
  }

  private async _getServerPromptChannel(server: Guild) {
    const channels: Collection<string, GuildBasedChannel> =
      await server.channels.fetch();

    return channels.find(
      (ch) =>
        ch.parentId === null &&
        (this.instructionsChannelPattern.test(ch.name) ||
          this.oldInstructionsChannelPattern.test(ch.name)),
    ) as TextChannel;
  }

  private async _getCategoryPromptChannel(
    server: Guild,
    category: CategoryChannel,
  ) {
    const channels: Collection<string, GuildBasedChannel> =
      await server.channels.fetch();

    return channels.find(
      (ch) =>
        ch.parentId === category.id &&
        (this.instructionsChannelPattern.test(ch.name) ||
          this.oldInstructionsChannelPattern.test(ch.name)),
    ) as TextChannel;
  }

  private async _getBotReactionMessages(botConfigChannel: TextChannel) {
    const messages = (await botConfigChannel.messages.fetch({
      message: null,
      force: true,
    })) as unknown as Collection<string, Message>;

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
    let pinnedMessagesContent = `MESSAGES PINNED IN CHANNEL ${channel.name}:\n\n`;

    let pinnedMessageCount = 0;
    for (const message of pinnedMessages.values()) {
      const { humanInputText, attachmentText } =
        await this._discordMessageService.extractMessageContent(message);
      pinnedMessagesContent += `Pinned message ${pinnedMessageCount++}:\n`;
      pinnedMessagesContent += humanInputText + attachmentText + '\n\n';
    }
    pinnedMessagesContent += '\nEND PINNED MESSAGES';
    return pinnedMessagesContent;
  }
}
