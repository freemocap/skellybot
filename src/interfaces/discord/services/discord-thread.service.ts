import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Message, ThreadChannel, userMention } from 'discord.js';

@Injectable()
export class DiscordThreadService {
  private readonly logger = new Logger(DiscordThreadService.name);

  public async createNewThread(startingTextString: string, interaction) {
    try {
      const maxThreadNameLength = 100; // Discord's maximum thread name length
      let threadName = startingTextString;
      if (threadName.length > maxThreadNameLength) {
        threadName = threadName.substring(0, maxThreadNameLength);
      }
      const threadTitleEmbed = new EmbedBuilder()
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

      let threadAnchorMessage: Message;

      if (interaction.channel instanceof ThreadChannel) {
        threadAnchorMessage = await interaction.channel.parent.send({
          content: `Thread Created for user: ${userMention(
            interaction.user.id,
          )} with starting text:\n\n> ${startingTextString}`,
          embeds: [threadTitleEmbed],
        });
      } else {
        threadAnchorMessage = await interaction.channel.send({
          content: `Thread Created for user: ${userMention(
            interaction.user.id,
          )} with starting text:\n\n> ${startingTextString}`,
          embeds: [threadTitleEmbed],
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
}
