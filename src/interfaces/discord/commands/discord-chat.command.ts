import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
  TargetMessage,
} from 'necord';
import { DiscordMessageService } from '../services/discord-message.service';
import { DiscordOnMessageService } from '../services/discord-on-message.service';
import { DiscordThreadService } from '../services/discord-thread.service';
import { ActionRowBuilder, ButtonBuilder, Message } from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

export class StartingTextDto {
  @StringOption({
    name: 'text',
    description: 'Starting text for the chat',
    required: false,
  })
  text: string;
  @StringOption({
    name: 'llm',
    description: 'Select a language model',
    required: false,
    choices: [
      { name: 'gpt-4o', value: 'gpt-4o' },
      { name: 'gpt-4', value: 'gpt-4' },
      { name: 'o1-mini', value: 'gpt-4-vision' },
    ],
  })
  llm: string;
}

@Injectable()
export class DiscordChatCommand {
  private readonly logger = new Logger(DiscordChatCommand.name);

  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _onMessageService: DiscordOnMessageService,
    private readonly _threadService: DiscordThreadService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the chatbot.',
  })
  public async onSlashChatCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: StartingTextDto,
  ) {
    try {
      await interaction.deferReply();
      if (!startingText.text) {
        startingText.text = '.';
      }

      this.logger.log(
        `Recieved '/chat' command with starting text:'${startingText.text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
      );
      const thread = await this._threadService.createNewThread(
        startingText.text,
        interaction,
      );

      const firstThreadMessage = await thread.send(
        `Starting new chat with initial message:\n\n> ${startingText.text}`,
      );

      await this._onMessageService.addActiveChat(firstThreadMessage);
      await this._messageService.respondToMessage(
        firstThreadMessage,
        firstThreadMessage,
        interaction.user.id,
        true,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
      await interaction.editReply(`Error opening chat thread: ${error}`);
    }
  }

  @MessageCommand({
    name: 'Open `/chat` thread',
  })
  public async onMessageContextChatCommand(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    await interaction.deferReply();
    try {
      const { humanInputText, attachmentText } =
        await this._messageService.extractMessageContent(message);

      this.logger.log(
        `Received 'message context menu' command for Message: ${message.id} in channel: name= ${interaction.channel.name}, id=${message.channel.id} `,
      );
      const thread = await this._threadService.createNewThread(
        humanInputText + attachmentText,
        interaction,
      );

      const firstMessageContent = `Starting new chat with initial message:\n\n> ${
        humanInputText + attachmentText
      }`;

      const firstThreadMessages = await this._messageService.sendChunkedMessage(
        thread,
        firstMessageContent,
      );

      const firstThreadMessage = firstThreadMessages[0];
      await firstThreadMessage.edit({
        content: firstThreadMessage.content,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('BUTTON')
              .setLabel('LABEL')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      });

      await this._onMessageService.addActiveChat(firstThreadMessage);
      await this._messageService.respondToMessage(
        firstThreadMessage,
        thread,
        interaction.user.id,
        true,
        firstMessageContent,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
      await interaction.editReply(`Error opening chat thread: ${error}`);
    }
  }
}
