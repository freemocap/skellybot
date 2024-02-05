import { Injectable, Logger } from '@nestjs/common';
import {
  AttachmentOption,
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  SlashCommand,
  SlashCommandContext,
  TargetMessage,
} from 'necord';
import {
  Attachment,
  AttachmentBuilder,
  CacheType,
  ChatInputCommandInteraction,
  GuildMember,
  Message,
  MessageContextMenuCommandInteraction,
  PermissionsBitField,
} from 'discord.js';
import * as path from 'path';
import axios from 'axios';
import { DiscordServerConfigService } from './discord-server-configuration.service';
import {
  DiscordServerConfig,
  validateServerConfig,
} from './server-config-schema';
import * as TOML from 'toml';
import * as YAML from 'yaml';

class ConfigAttachmentOption {
  @AttachmentOption({
    name: 'config-attachment',
    description: 'The server configuration file (see discord-chat.command.ts)',
    required: true,
  })
  public serverConfigAttachment: Attachment;
}

@Injectable()
export class DiscordDeployServerCommand {
  private readonly logger = new Logger(DiscordDeployServerCommand.name);

  constructor(
    private readonly _serverConfigService: DiscordServerConfigService,
  ) {}

  @SlashCommand({
    name: 'deploy',
    description:
      'Deploy the server configuration from the provided attachment.',
  })
  public async onSlashCommandInvoke(
    @Context() [interaction]: SlashCommandContext,
    @Options(ConfigAttachmentOption)
    { serverConfigAttachment }: ConfigAttachmentOption,
  ) {
    try {
      await this._deployServer(interaction, serverConfigAttachment);
    } catch (error) {
      this.logger.error(`Error deploying server: ${error.stack}`);
      await interaction.reply({
        content: `Error deploying server: \n\n> ${error.message}`,
      });
    }
  }

  @MessageCommand({
    name: 'Deploy server from attachment',
  })
  public async onContextCommandInvoke(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    try {
      const messageAttachment = await this._getConfigAttachment(message);
      await this._deployServer(interaction, messageAttachment);
    } catch (error) {
      this.logger.error(`Error deploying server: ${error.stack}`);
      await interaction.reply({
        content: `Error deploying server: \n\n> ${error.message}`,
      });
    }
  }

  private async _deployServer(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | MessageContextMenuCommandInteraction<CacheType>,
    serverConfigAttachment: Attachment,
  ) {
    const invokingMember = interaction.member as GuildMember;
    await interaction.deferReply();

    const { allowed, errorMessage } =
      await this._checkPermissions(invokingMember);
    if (!allowed) {
      await interaction.editReply({
        content: errorMessage,
      });
      return;
    }

    const serverConfig: DiscordServerConfig =
      await this._getServerConfigFromAttachment(serverConfigAttachment);

    this.logger.debug(
      'Server config:\n\n',
      JSON.stringify(serverConfig, null, 2),
    );

    try {
      await this._serverConfigService.configureServer(
        interaction.guild.id,
        serverConfig,
      );
    } catch (error) {
      await interaction.editReply({
        content: `Error configuring server: \n\n> ${error.message}`,
      });
      return;
    }
    const attachment = new AttachmentBuilder(
      Buffer.from(JSON.stringify(serverConfig, null, 2)),
      {
        name: `server-config.json`,
      },
    );
    await interaction.editReply({
      content: 'Server Config from attachment has been applied.',
      files: [attachment],
    });
  }

  private async _checkPermissions(invokingMember: GuildMember) {
    let errorMessage = 'Permissions checks: \n\n';
    let memberIsMissingPermissions = false;
    switch (true) {
      case !invokingMember.permissions.has(
        PermissionsBitField.Flags.ManageChannels,
      ):
        errorMessage += `Error - Invoking user - ${invokingMember.user} - does not have "Manage Channels" permission.`;
        memberIsMissingPermissions = true;
      case !invokingMember.permissions.has(
        PermissionsBitField.Flags.ManageRoles,
      ):
        errorMessage += `Error - Invoking user - ${invokingMember.user} - does not have "Manage Roles" permission.`;
        memberIsMissingPermissions = true;
      case !invokingMember.permissions.has(
        PermissionsBitField.Flags.ManageNicknames,
      ):
        errorMessage += `Error - Invoking user - ${invokingMember.user} - does not have "Manage Nicknames" permission.`;
        memberIsMissingPermissions = true;
    }
    let allowed = true;
    if (
      // if "error" is not in errorMessage.lower
      memberIsMissingPermissions &&
      !invokingMember.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      allowed = false;
    }

    return { allowed, errorMessage };
  }

  private async _getServerConfigFromAttachment(attachment: Attachment) {
    try {
      const serverConfig = await this._parseConfigAttachment(attachment);
      if (!serverConfig.isValid) {
        new Error(
          `Invalid server configuration: ${serverConfig.errors
            .map((error) => error.toString())
            .join(', ')}`,
        );
      }
      return serverConfig.config;
    } catch (error) {
      throw new Error(
        `Error processing attachment: ${error.stack} \n\n ${
          error.message || error
        }`,
      );
    }
  }

  private async _parseConfigAttachment(messageAttachment: Attachment) {
    try {
      const fileExtension = path.extname(messageAttachment.name).toLowerCase();
      let parsedConfig: DiscordServerConfig;

      const response = await axios.get(messageAttachment.url, {
        responseType: 'arraybuffer',
      });
      const fileContent = response.data.toString('utf-8');

      // Determine the file type and parse accordingly
      switch (fileExtension) {
        case '.json':
          parsedConfig = JSON.parse(fileContent);
          break;
        case '.toml':
          parsedConfig = TOML.parse(fileContent);
          break;
        case '.yaml':
        case '.yml':
          parsedConfig = YAML.parse(fileContent);
          break;
        default:
          new Error(
            'Unsupported file type. Only JSON, TOML, and YAML are supported.',
          );
      }

      return await validateServerConfig(parsedConfig);
    } catch (error) {
      throw new Error(
        `Error parsing attachment: ${error.stack} \n\n ${
          error.message || error
        }`,
      );
    }
  }

  private async _getConfigAttachment(message: Message<boolean>) {
    await this._validateNumberOfAttachments(message);
    const messageAttachment = message.attachments.first();

    if (!messageAttachment || messageAttachment.name === null) {
      new Error('No attachment found.');
    }
    return messageAttachment;
  }

  private async _validateNumberOfAttachments(message: Message<boolean>) {
    let errorMessage = '';
    if (message.attachments.size === 0) {
      errorMessage = 'The message does not contain any attachments.';
    } else if (message.attachments.size > 1) {
      errorMessage = 'The message contains more than one attachment.';
    }
    if (errorMessage) {
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}
