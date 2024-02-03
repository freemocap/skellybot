import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  TargetMessage,
} from 'necord';
import { GuildMember, Message, PermissionsBitField } from 'discord.js';
import * as path from 'path';
import fs from 'fs';
import axios from 'axios';
import { DiscordServerConfigService } from './discord-server-configuration.service';
import {
  DiscordServerConfig,
  validateServerConfig,
} from './server-config-schema';

@Injectable()
export class DiscordConfigureServerCommand {
  private readonly logger = new Logger(DiscordConfigureServerCommand.name);

  constructor(
    private readonly _serverConfigService: DiscordServerConfigService,
  ) {}

  @MessageCommand({
    name: 'Configure server from JSON',
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
      const response = await this._serverConfigService.configureServer(
        interaction.guild.id,
        serverConfig,
      );
      await interaction.editReply(
        `Server Config command returned: ${JSON.stringify(response)}`,
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
      await this._validateNumberOfAttachments(message);
      const messageAttachment = message.attachments.first();

      if (!messageAttachment || messageAttachment.name === null) {
        new Error('No attachment found.');
      }

      const fileExtension = path.extname(messageAttachment.name).toLowerCase();
      if (fileExtension !== '.json') {
        new Error('The attachment must be a JSON file.');
      }

      const response = await axios.get(messageAttachment.url, {
        responseType: 'arraybuffer',
      });

      const fileContent = response.data.toString('utf-8');
      const valdationResponse = await validateServerConfig(
        JSON.parse(fileContent),
      );
      if (!valdationResponse.isValid) {
        throw new Error(
          `Invalid server configuration: ${valdationResponse.errors
            .map((error) => error.toString())
            .join(', ')}`,
        );
      }
      return valdationResponse.config;
    } catch (error) {
      throw new Error(`Error processing attachment: ${error.message || error}`);
    }
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
