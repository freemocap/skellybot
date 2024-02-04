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
  GuildMember,
  Message,
  PermissionsBitField,
} from 'discord.js';
import * as path from 'path';
import fs from 'fs';
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
export class DiscordConfigureServerCommand {
  private readonly logger = new Logger(DiscordConfigureServerCommand.name);

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
    const invokingMember = interaction.member as GuildMember;
    if (
      !invokingMember.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      await interaction.editReply({
        content:
          'You need to have the "Manage Channels" permission to use this command.',
      });
      return;
    }

    await interaction.deferReply();
    const serverConfig: DiscordServerConfig =
      await this._getServerConfigFromAttachment(serverConfigAttachment);

    this.logger.debug(
      'Server config:\n\n',
      JSON.stringify(serverConfig, null, 2),
    );

    await this._serverConfigService.configureServer(
      interaction.guild.id,
      serverConfig,
    );
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

  @MessageCommand({
    name: 'Configure server from attachment',
  })
  public async onContextCommandInvoke(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const invokingMember = interaction.member as GuildMember;
    if (
      !invokingMember.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      await interaction.editReply({
        content:
          'You need to have the "Manage Channels" permission to use this command.',
      });
      return;
    }

    this.logger.log(
      `Received "${interaction.command.name}" command in channel: name= ${interaction.channel.name}, id=${interaction.channel.id}`,
    );

    const tempFilePath = '';
    try {
      const messageAttachment = await this._getConfigAttachement(message);
      const serverConfig: DiscordServerConfig =
        await this._getServerConfigFromAttachment(messageAttachment);

      this.logger.debug(
        'Server config:\n\n',
        JSON.stringify(serverConfig, null, 2),
      );

      await this._serverConfigService.configureServer(
        interaction.guild.id,
        serverConfig,
      );

      await interaction.editReply(
        `Server Config from message ${message.url} has been applied.`,
      );
    } catch (error) {
      const errorMessage = `Error Occurred: ${error.message || error}`;
      this.logger.error(error.stack + '\n\n' + errorMessage);
      await interaction.editReply(errorMessage);
    } finally {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch {}
    }
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

  private async _getConfigAttachement(message: Message<boolean>) {
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
