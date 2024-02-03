import { Injectable, Logger } from '@nestjs/common';
import { Client, Guild, GuildMember, TextChannel } from 'discord.js';
import {
  DiscordMemberConfig,
  DiscordRoleConfig,
  DiscordServerConfig,
} from './server-config-schema';
import { DiscordMessageService } from '../../services/discord-message.service';
import { DiscordConfigureCategoryService } from './discord-configure-category.service';
import { DiscordChannelCategoryService } from './discord-configure-channel.service';

@Injectable()
export class DiscordServerConfigService {
  private readonly logger = new Logger(DiscordServerConfigService.name);
  constructor(
    private readonly client: Client,
    private readonly _configureCategoryService: DiscordConfigureCategoryService,
    private readonly _configureChannelService: DiscordChannelCategoryService,
    private readonly _messageService: DiscordMessageService,
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
    await this._configureRoles(server, serverConfig);
    await this._configureMembers(server, serverConfig);

    await this._configureCategoryService.applyServerConfig(
      server,
      serverConfig,
    );
    await this._configureChannelService.applyServerConfig(server, serverConfig);
    await this._configureMessages(server, serverConfig);
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

      this.logger.log(`Fetched user: ${guildMember.user.username}`);
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
      if (!roleToAdd) {
        this.logger.error('Role not found:', roleName);
        throw new Error(`Role not found: "${roleName}"`);
      }
      if (!guildMember.roles.cache.has(roleToAdd.id)) {
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

  private async _configureMessages(
    server: Guild,
    serverConfig: DiscordServerConfig,
  ) {
    this.logger.log('Configuring messages...');
    for (const messageConfig of serverConfig.messages) {
      const channel = server.channels.cache.find(
        (c) => c.name === messageConfig.channelName,
      ) as TextChannel;
      if (!channel) {
        throw new Error(
          `Channel not found: "${messageConfig.channelName}" for message: "${messageConfig.content}"`,
        );
      }
      const messages = await this._messageService.sendChunkedMessage(
        channel,
        messageConfig.content,
      );
      if (messageConfig.reactions) {
        for (const reaction of messageConfig.reactions) {
          await messages[messages.length - 1].react(reaction);
        }
      }
    }
  }
}
