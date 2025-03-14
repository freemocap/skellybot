// src/interfaces/discord/commands/discord-chat.command.ts
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
import { OpenaiChatService } from '../../../core/ai/openai/openai-chat.service';
import { ActionRowBuilder, ButtonBuilder, Message } from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import {
  OpenaiConfigFactory,
  OpenAIModelType,
} from '../../../core/ai/openai/openai-config.factory';

const AVAILABLE_MODELS = OpenaiChatService.prototype.getAvailableLLMs();

export class InitialChatDto {
  @StringOption({
    name: 'text',
    description: 'Starting text for the chat',
    required: false,
  })
  text: string;

  @StringOption({
    name: 'model',
    description: 'Select a language model',
    required: false,
    choices: AVAILABLE_MODELS.map((model) => ({ name: model, value: model })),
  })
  model: string = 'gpt-4o';
}

@Injectable()
export class DiscordChatCommand {
  private readonly logger = new Logger(DiscordChatCommand.name);

  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _onMessageService: DiscordOnMessageService,
    private readonly _threadService: DiscordThreadService,
    private readonly _configFactory: OpenaiConfigFactory,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the chatbot.',
  })
  public async onSlashChatCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) chatInitCommand?: InitialChatDto,
  ) {
    try {
      await interaction.deferReply();
      if (!chatInitCommand.text) {
        chatInitCommand.text = '.';
      }
      if (!chatInitCommand.model) {
        chatInitCommand.model = 'gpt-4o';
      }

      this.logger.log(
        `Received '/chat' command with starting text:'${chatInitCommand.text}' and model:'${chatInitCommand.model}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
      );

      // Validate the model choice is compatible with parameters
      const validatedModel = chatInitCommand.model as OpenAIModelType;

      const thread = await this._threadService.createNewThread(
        chatInitCommand.text,
        interaction,
      );

      const firstThreadMessage = await thread.send(
        `\`\`\`New chat created.\n\nmodel: ${validatedModel}\n\ninitial message: ${chatInitCommand.text}\n\`\`\``,
      );

      await this._onMessageService.addActiveChat(
        firstThreadMessage,
        validatedModel,
      );

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

      // Default to gpt-4o for context menu commands
      const defaultModel = 'gpt-4o';
      await this._onMessageService.addActiveChat(
        firstThreadMessage,
        defaultModel,
      );

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
