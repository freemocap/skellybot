import { Injectable, Logger } from '@nestjs/common';
import {
  CategoryChannel,
  ChannelType,
  Client,
  Guild,
  GuildBasedChannel,
  GuildMember,
  TextChannel,
} from 'discord.js';
import {
  DiscordCategoryConfig,
  DiscordMemberConfig,
  DiscordRoleConfig,
  DiscordServerConfig,
} from './server-config-schema';
import { DiscordMessageService } from '../../services/discord-message.service';
import { DiscordContextPromptService } from '../../services/discord-context-prompt.service';

@Injectable()
export class DiscordServerConfigService {
  private readonly logger = new Logger(DiscordServerConfigService.name);
  constructor(
    private readonly client: Client,
    private readonly _messageService: DiscordMessageService,
    private readonly _contextPromptService: DiscordContextPromptService,
  ) {}

  public async configureServer(
    serverID: string,
    serverConfig: DiscordServerConfig,
  ): Promise<void> {
    this.logger.log(
      'Configuring server with:',
      JSON.stringify(serverConfig, null, 2),
    );
    const server = await this.client.guilds.fetch(serverID);
    await this._configureCategories(server, serverConfig);
    await this._configureRoles(server, serverConfig);
    await this._configureMembers(server, serverConfig);
  }

  private async _configureCategories(
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

      await this._sendBotPromptSettingsMessage(
        botPromptChannel,
        categoryConfig,
      );
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

  private async _configureRoles(
    server: Guild,
    serverConfig: DiscordServerConfig,
  ) {
    this.logger.log('Configuring roles...');
    for (const roleConfig of serverConfig.roles) {
      const role = await this._createRoleIfNotExists(server, roleConfig);
      if (roleConfig.color) {
        await role.setColor(roleConfig.color);
      }
      if (roleConfig.hoist !== undefined) {
        await role.setHoist(roleConfig.hoist);
      }
      // TODO - configure permissions
    }
  }

  private async _createRoleIfNotExists(
    server: Guild,
    roleConfig: DiscordRoleConfig,
  ) {
    const existingRole = server.roles.cache.find(
      (role) => role.name === roleConfig.name,
    );
    if (existingRole) {
      this.logger.log(`Role already exists, skipping: "${roleConfig.name}"`);
      return existingRole;
    }

    const role = await server.roles.create({
      name: roleConfig.name,
      color: roleConfig.color,
    });
    this.logger.log(`Created role: '${role.name}'`);
    return role;
  }

  private async _configureMembers(
    server: Guild,
    serverConfig: DiscordServerConfig,
  ) {
    this.logger.log('Configuring members...');
    for (const memberConfig of serverConfig.members) {
      const guildMember = await this._getMember(server, memberConfig);
      await this._applyRoleToMember(memberConfig, guildMember, server);

      await guildMember.setNickname(memberConfig.nickname);

      this.logger.log(`Fetched user: ${JSON.stringify(guildMember, null, 2)}`);
    }
  }

  private async _applyRoleToMember(
    memberConfig: DiscordMemberConfig,
    guildMember: GuildMember,
    server: Guild,
  ) {
    for (const roleName of memberConfig.roles) {
      const roleToAdd = server.roles.cache.find(
        (role) => role.name === roleName,
      );
      if (roleToAdd && !guildMember.roles.cache.has(roleToAdd.id)) {
        await guildMember.roles.add(roleToAdd);
      } else {
        this.logger.log(
          `Member "${guildMember.user.username}" already has role: "${roleName}"`,
        );
      }
    }
  }
  private async _getMember(server: Guild, memberConfig: DiscordMemberConfig) {
    const guildMember = await (async () => {
      const m = await server.members.fetch({
        query: memberConfig.username,
      });

      return m.first();
    })();
    if (!guildMember) {
      this.logger.error('User not found:', memberConfig.username);
      new Error(`User not found: "${memberConfig.username}"`);
    }
    return guildMember;
  }

  private async _sendBotPromptSettingsMessage(
    botPromptChannel: TextChannel,
    categoryConfig: DiscordCategoryConfig,
  ) {
    for (const messageContent of categoryConfig.botPromptMessages) {
      const promptMessages = await this._messageService.sendChunkedMessage(
        botPromptChannel,
        messageContent,
      );
      const promptMessage = promptMessages[promptMessages.length - 1];

      this.logger.log(`Sent prompt message: "${messageContent}"`);
      await promptMessage.react(this._contextPromptService.botPromptEmoji);
    }
  }
}
