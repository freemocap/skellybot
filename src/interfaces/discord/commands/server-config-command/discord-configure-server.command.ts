import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  TargetMessage,
} from 'necord';
import {
  Attachment,
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

@Injectable()
export class DiscordConfigureServerCommand {
  private readonly logger = new Logger(DiscordConfigureServerCommand.name);

  constructor(
    private readonly _serverConfigService: DiscordServerConfigService,
  ) {}

  @MessageCommand({
    name: 'Configure server from attachment',
  })
  public async onCommandInvoke(
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
      `Received /deploy command in channel: name= ${interaction.channel.name}, id=${interaction.channel.id}`,
    );

    const tempFilePath = '';
    try {
      const serverConfig: DiscordServerConfig =
        await this._getServerConfigFromAttachment(message);

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
      this.logger.error(errorMessage);
      await interaction.editReply(errorMessage);
    } finally {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch {}
    }
  }
  private async _getServerConfigFromAttachment(message: Message<boolean>) {
    try {
      const messageAttachment = await this._getConfigAttachement(message);
      const serverConfig = await this._parseConfigAttachment(messageAttachment);
      if (!serverConfig.isValid) {
        throw new Error(
          `Invalid server configuration: ${serverConfig.errors
            .map((error) => error.toString())
            .join(', ')}`,
        );
      }
      return serverConfig.config;
    } catch (error) {
      throw new Error(`Error processing attachment: ${error.message || error}`);
    }
  }

  private async _parseConfigAttachment(messageAttachment: Attachment) {
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

    const valdationResponse = await validateServerConfig(parsedConfig);
    return valdationResponse;
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
