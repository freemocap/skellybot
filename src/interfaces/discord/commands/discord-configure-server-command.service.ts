import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  TargetMessage,
} from 'necord';
import { DiscordAttachmentService } from '../services/chats/discord-attachment.service';
import { Message } from 'discord.js';
import * as path from 'path';
import fs from 'fs';
import axios from 'axios';
import { ServerConfig } from './server-config-command/server-config-interface';

@Injectable()
export class DiscordConfigureServerCommand {
  private readonly logger = new Logger(DiscordConfigureServerCommand.name);

  constructor(
    private readonly _discordAttachmentService: DiscordAttachmentService,
  ) {}
  @MessageCommand({
    name: 'Configure server from JSON',
    guilds: ['1198365355698028595'],
  })
  public async onDeployCommand(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    await interaction.deferReply();

    this.logger.log(
      `Received /deploy command in channel: name= ${interaction.channel.name}, id=${interaction.channel.id}`,
    );

    const tempFilePath = '';
    try {
      const serverConfig: ServerConfig =
        await this._getServerConfigFromAttachment(message);

      this.logger.debug(
        'Server config:\n\n',
        JSON.stringify(serverConfig, null, 2),
      );
      //TODO - add the logic to configure the server
    } catch (error) {
      const errorMessage = `Error processing attachment: ${
        error.message || error
      }`;
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
      return JSON.parse(fileContent);
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
