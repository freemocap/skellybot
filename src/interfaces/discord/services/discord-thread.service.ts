import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Message, ThreadChannel, userMention } from 'discord.js';

@Injectable()
export class DiscordThreadService {
  private readonly logger = new Logger(DiscordThreadService.name);
  private lastThreadRenames = new Map<string, number>(); // Maps threadId -> timestamp
  private readonly RENAME_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  public async createNewThread(startingTextString: string, interaction) {
    try {
      const maxThreadNameLength = 100; // Discord's maximum thread name length
      let threadName = startingTextString;
      if (threadName.length > maxThreadNameLength) {
        threadName = threadName.substring(0, maxThreadNameLength);
      }
      const anchorMessageEmbed = this._createAnchorMessageEmbed(interaction);

      let threadAnchorMessage: Message;

      if (interaction.channel instanceof ThreadChannel) {
        threadAnchorMessage = await interaction.channel.parent.send({
          content: `Thread Created for user: ${userMention(
            interaction.user.id,
          )}`,
          embeds: [anchorMessageEmbed],
        });
      } else {
        threadAnchorMessage = await interaction.channel.send({
          content: `Thread Created for user: ${userMention(
            interaction.user.id,
          )}`,
          embeds: [anchorMessageEmbed],
        });
      }

      const thread = await threadAnchorMessage.startThread({
        name: threadName,
      });

      await interaction.editReply({
        content: `Created thread: \n\n> ${thread.name}: ${thread.url}`,
        ephemeral: !(interaction.channel instanceof ThreadChannel),
      });

      return thread;
    } catch (error) {
      this.logger.error(
        `Something went wrong during '_createNewThread()':  Caught error: '${error}'`,
      );
    }
  }

  private _createAnchorMessageEmbed(interaction) {
    return new EmbedBuilder()
      .setColor(0x0099ff)
      .setAuthor({
        name: `Thread created by ${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
      })
      .setTimestamp()
      .addFields({
        name: '`skellybot` source code:',
        value: 'https://github.com/freemocap/skellybot',
      });
  }

  // Add to DiscordThreadService class
  public async updateThreadTitle(thread: ThreadChannel, newTitle: string) {
    try {
      const threadId = thread.id;
      const currentTime = Date.now();
      const lastRenameTime = this.lastThreadRenames.get(threadId) || 0;

      // Check if enough time has passed since the last rename
      if (currentTime - lastRenameTime < this.RENAME_TIMEOUT) {
        this.logger.debug(
          `Skipping thread rename for ${threadId}: rate limit cooldown (renamed ${
            (currentTime - lastRenameTime) / 1000
          } seconds ago)`,
        );
        return false;
      }

      this.logger.debug(`Updating thread ${threadId} title to: ${newTitle}`);
      await thread.setName(newTitle);

      // Update the last rename timestamp
      this.lastThreadRenames.set(threadId, currentTime);
      return true;
    } catch (error) {
      this.logger.error(
        `Error updating thread title: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
  public canRenameThread(threadId: string): {
    canRename: boolean;
    timeElapsed: number;
    timeRemaining: number;
  } {
    const currentTime = Date.now();
    const lastRenameTime = this.lastThreadRenames.get(threadId) || 0;
    const timeElapsed = currentTime - lastRenameTime;
    const timeRemaining = Math.max(0, this.RENAME_TIMEOUT - timeElapsed);

    // Return an object with timing information
    return {
      canRename: timeElapsed >= this.RENAME_TIMEOUT,
      timeElapsed,
      timeRemaining,
    };
  }
}
