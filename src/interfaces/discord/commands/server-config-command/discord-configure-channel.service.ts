import { CategoryChannel, ChannelType, Guild, TextChannel } from 'discord.js';
import {
  DiscordServerConfig,
  DiscordTextChannelConfig,
} from './server-config-schema';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscordChannelCategoryService {
  private readonly logger = new Logger(DiscordChannelCategoryService.name);

  public async applyServerConfig(
    server: Guild,
    serverConfig: DiscordServerConfig,
  ) {
    this.logger.log('Configuring channels...');
    for (const channelConfig of serverConfig.channels) {
      const channel = await this._createChannelIfNotExists(
        server,
        channelConfig,
      );
      if (channel.parent) {
        await channel.lockPermissions(); // sync permissions with parent
      }

      await channel.setTopic(channelConfig.topic);
      if (channelConfig.position !== undefined) {
        // NOTE - position can be 0, so we need to check for undefined
        await this._setChannelPosition(channel, channelConfig);
      }
      // await this._configurePermissions(channel, channelConfig); // TODO - configure permissions
    }
  }
  private async _setChannelPosition(
    channel: TextChannel,
    channelConfig: DiscordTextChannelConfig,
  ) {
    try {
      await channel.setPosition(channelConfig.position);
    } catch (error) {
      this.logger.error(`Failed to set channel position: ${error.message}`);
      throw error;
    }
  }
  private async _createChannelIfNotExists(
    server: Guild,
    channelConfig: DiscordTextChannelConfig,
  ): Promise<TextChannel> {
    let channel = await this._findChannel(server, channelConfig);
    if (!channel) {
      channel = await this._createChannel(server, channelConfig);
      this.logger.log(`Created channel: ${channel.name}`);
      await channel.setTopic(channelConfig.topic);
      // await this._configurePermissions(channel, channelConfig); // TODO - configure permissions
    } else {
      this.logger.log(
        `Channel already exists, skipping: "${channelConfig.name}"`,
      );
    }
    return channel;
  }

  private async _findChannel(
    server: Guild,
    channelConfig: DiscordTextChannelConfig,
  ): Promise<TextChannel | undefined> {
    if (channelConfig.parentCategory) {
      const parentCategory = server.channels.cache.find(
        (c) =>
          c.name === channelConfig.parentCategory &&
          c.type === ChannelType.GuildCategory,
      ) as CategoryChannel;

      if (!parentCategory) {
        throw new Error(
          `Specified parent category (${channelConfig.parentCategory}) for channel ${channelConfig.name} not found in server.`,
        );
      }

      return parentCategory.children.cache.find(
        (c) => c.name === channelConfig.name,
      ) as TextChannel;
    } else {
      return server.channels.cache.find(
        (c) => c.name === channelConfig.name,
      ) as TextChannel;
    }
  }

  private async _createChannel(
    server: Guild,
    channelConfig: DiscordTextChannelConfig,
  ): Promise<TextChannel> {
    const channelType =
      channelConfig.type === 'forum'
        ? ChannelType.GuildForum
        : ChannelType.GuildText;

    if (channelConfig.parentCategory) {
      const parentCategory = server.channels.cache.find(
        (c) =>
          c.name === channelConfig.parentCategory &&
          c.type === ChannelType.GuildCategory,
      ) as CategoryChannel;

      if (!parentCategory) {
        throw new Error(
          `Specified parent category (${channelConfig.parentCategory}) for channel ${channelConfig.name} not found in server.`,
        );
      }

      return parentCategory.children.create({
        name: channelConfig.name,
        type: channelType,
      }) as Promise<TextChannel>;
    } else {
      return server.channels.create({
        name: channelConfig.name,
        type: channelType,
      }) as Promise<TextChannel>;
    }
  }
}
