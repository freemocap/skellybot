import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordTextDto } from '../../dto/discord-text.dto';
import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  userMention,
} from 'discord.js';
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
  public async onChatCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: DiscordTextDto,
  ) {
    try {
      await interaction.deferReply();
      if (!startingText.text) {
        startingText.text = '.';
      }

      this.logger.log(
        `Creating thread with starting text:'${startingText.text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
      );
      const thread = await this._createNewThread(startingText, interaction);

      const firstThreadMessage = await thread.send(
        `Starting new chat with initial message:\n\n> ${startingText.text}`,
      );

      await this._onMessageService.addActiveChat(firstThreadMessage);
      await this._messageService.respondToMessage(
        firstThreadMessage,
        interaction.user.id,
        true,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
    }
  }

  private async _createNewThread(
    startingText: DiscordTextDto,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    const maxThreadNameLength = 100; // Discord's maximum thread name length
    let threadName = startingText.text;
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

    const threadCreationMessage = await interaction.editReply({
      content: `Thread Created for user: ${userMention(
        interaction.user.id,
      )} with starting text:\n\n> ${startingText.text}`,
      embeds: [threadTitleEmbed],
      attachments: [],
    });
    return await threadCreationMessage.startThread({
      name: threadName,
    });
  }
}
