import { CategoryChannel, ChannelType, Guild, TextChannel } from 'discord.js';
import {
  DiscordCategoryConfig,
  DiscordServerConfig,
} from './server-config-schema';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordContextPromptService } from '../../services/discord-context-prompt.service';
import { DiscordMessageService } from '../../services/discord-message.service';

@Injectable()
export class DiscordConfigureCategoryService {
  private readonly logger = new Logger(DiscordConfigureCategoryService.name);
  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _contextPromptService: DiscordContextPromptService,
  ) {}

  public async applyServerConfig(
    server: Guild,
    serverConfig: DiscordServerConfig,
  ) {
    this.logger.log('Configuring categories...');
    for (const categoryConfig of serverConfig.categories) {
      const category = await this._createCategoryIfNotExists(
        server,
        categoryConfig.name,
      );
      const botPromptChannel =
        await this._contextPromptService.getOrCreatePromptChannel(
          server,
          category,
        );

      if (categoryConfig.botPromptMessages) {
        await this._sendBotPromptSettingsMessage(
          botPromptChannel,
          categoryConfig,
        );
      } else {
        this.logger.log(
          `No bot prompt messages defined for category: "${categoryConfig.name}"`,
        );
      }
    }
    // TODO - configure permissions
  }

  private async _createCategoryIfNotExists(
    server: Guild,
    categoryName: string,
  ) {
    const existingCategory = server.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === categoryName,
    );

    if (existingCategory) {
      this.logger.log(`Category already exists, skipping: "${categoryName}"`);
      return existingCategory as CategoryChannel;
    }
    const category = await server.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
    });
    this.logger.log(`Created category: ${category.name}`);
    return category;
  }

  private async _sendBotPromptSettingsMessage(
    botPromptChannel: TextChannel,
    categoryConfig: DiscordCategoryConfig,
  ) {
    // Fetch a certain number of recent messages from the channel
    const messages = await botPromptChannel.messages.fetch({ limit: 100 });
    for (const messageContent of categoryConfig.botPromptMessages) {
      // Check if a message with the same content already exists
      const existingMessage = messages.find(
        (msg) => msg.content === messageContent,
      );

      if (existingMessage) {
        this.logger.log(`Existing prompt message found: "${messageContent}"`);
        // Ensure the message has the prompt emoji
        if (
          !existingMessage.reactions.cache.has(
            this._contextPromptService.botPromptEmoji,
          )
        ) {
          await existingMessage.react(
            this._contextPromptService.botPromptEmoji,
          );
        }
      } else {
        // If no existing message, send a new one
        // TODO - if message is longer than discord message length, send as text attachment (and make sure the ContextInstructions respect it)
        const promptMessages = await this._messageService.sendChunkedMessage(
          botPromptChannel,
          messageContent,
        );
        this.logger.log(`Sent new prompt message: "${messageContent}"`);

        await promptMessages[promptMessages.length - 1].react(
          this._contextPromptService.botPromptEmoji,
        );
      }
    }
  }
}
