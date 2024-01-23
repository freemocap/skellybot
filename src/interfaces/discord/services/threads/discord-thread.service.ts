import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordTextDto } from '../../dto/discord-text.dto';
import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  userMention,
} from 'discord.js';
import { DiscordOnMessageService } from '../events/discord-on-message.service';
import { DiscordMessageService } from './discord-message.service';

@Injectable()
export class DiscordThreadService {
  constructor(
    private readonly _logger: Logger,
    private readonly _onMessageService: DiscordOnMessageService,
    private readonly _messageService: DiscordMessageService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the chatbot.',
  })
  public async onThreadCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: DiscordTextDto,
  ) {
    await interaction.deferReply();
    if (!startingText.text) {
      startingText.text = '.';
    }

    this._logger.log(
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
