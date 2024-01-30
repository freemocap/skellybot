import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  SlashCommand,
  SlashCommandContext,
  TargetMessage,
} from 'necord';
import { DiscordTextDto } from '../../dto/discord-text.dto';
import { EmbedBuilder, Message, ThreadChannel, userMention } from 'discord.js';
import { DiscordMessageService } from './discord-message.service';
import { DiscordOnMessageService } from '../events/discord-on-message.service';

@Injectable()
export class DiscordChatService {
  private readonly logger = new Logger(DiscordChatService.name);

  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _onMessageService: DiscordOnMessageService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the chatbot.',
  })
  public async onSlashChatCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: DiscordTextDto,
  ) {
    try {
      await interaction.deferReply();
      if (!startingText.text) {
        startingText.text = '.';
      }

      this.logger.log(
        `Recieved '/chat' command with starting text:'${startingText.text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
      );
      const thread = await this._createNewThread(
        startingText.text,
        interaction,
      );

      const firstThreadMessage = await thread.send(
        `Starting new chat with initial message:\n\n> ${startingText.text}`,
      );

      await this._onMessageService.addActiveChat(thread.id, firstThreadMessage);
      await this._messageService.respondToMessage(
        firstThreadMessage,
        firstThreadMessage,
        interaction.user.id,
        true,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
    }
  }

  @MessageCommand({
    name: 'Open `/chat` thread',
  })
  public async onMessageContextChatCommand(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() targetMessage: Message,
  ) {
    await interaction.deferReply();

    try {
      // const { humanInputText, attachmentText } =
      //   await this._messageService.extractMessageContent(targetMessage);

      this.logger.log(
        `Received 'message context menu' command for Message: ${targetMessage.id} in channel: name= ${interaction.channel.name}, id=${targetMessage.channel.id} `,
      );
      const thread = await this._createNewThread(
        targetMessage.content || '.',
        interaction,
      );

      await this._onMessageService.addActiveChat(
        thread.id,
        await thread.send(
          `Started new thread for ${userMention(interaction.user.id)}`,
        ),
      );

      await this._messageService.respondToMessage(
        targetMessage,
        thread,
        interaction.user.id,
        true,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
    }
  }

  private async _createNewThread(startingTextString: string, interaction) {
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
          )}`,
          embeds: [threadTitleEmbed],
        });
      } else {
        threadAnchorMessage = await interaction.channel.send({
          content: `Thread Created for user: ${userMention(
            interaction.user.id,
          )}`,
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
