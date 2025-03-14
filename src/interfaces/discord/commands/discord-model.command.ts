// src/interfaces/discord/commands/discord-model.command.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
} from 'necord';
import { DiscordOnMessageService } from '../services/discord-on-message.service';
import { OpenaiChatService } from '../../../core/ai/openai/openai-chat.service';
import { OpenAIModelType } from '../../../core/ai/openai/openai-config.factory';
// import { ThreadChannel } from 'discord.js';

const AVAILABLE_MODELS = OpenaiChatService.prototype.getAvailableLLMs();

export class ChangeModelDto {
  @StringOption({
    name: 'model',
    description: 'Select a language model',
    required: true,
    choices: AVAILABLE_MODELS.map((model) => ({ name: model, value: model })),
  })
  model: string;
}

@Injectable()
export class DiscordModelCommand {
  private readonly logger = new Logger(DiscordModelCommand.name);

  constructor(private readonly _onMessageService: DiscordOnMessageService) {}

  @SlashCommand({
    name: 'model',
    description: 'Change the AI model for this chat thread',
  })
  public async onChangeModelCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() changeModelDto: ChangeModelDto,
  ) {
    try {
      // Change from ephemeral (only visible to command user) to public
      await interaction.deferReply({ ephemeral: false });

      // Check if this is a thread
      if (!interaction.channel.isThread()) {
        return interaction.editReply(
          'This command can only be used in thread channels.',
        );
      }

      const thread = interaction.channel;

      this.logger.log(
        `Received '/model' command to change model to: ${changeModelDto.model} in thread: ${interaction.channelId}`,
      );

      // Check if this is an active chat thread
      const activeChat = await this._onMessageService.getActiveChatForChannel(
        interaction.channelId,
      );
      if (!activeChat) {
        return interaction.editReply(
          'This command can only be used in an active AI chat thread.',
        );
      }

      // Get previous model for better context in the announcement
      const previousModel = activeChat.modelName;

      // Validate the model choice
      const validatedModel = changeModelDto.model as OpenAIModelType;

      // Update the model in the AI chat document
      await this._onMessageService.updateActiveChatModel(
        interaction.channelId,
        validatedModel,
      );

      // Update the thread's info message (second message)
      try {
        // Fetch the messages in the thread
        const messages = await thread.messages.fetch({ limit: 5 });
        // Sort by creation time
        const sortedMessages = [...messages.values()].sort(
          (a, b) => a.createdTimestamp - b.createdTimestamp,
        );

        // Get the second message (index 1)
        const infoMessage =
          sortedMessages.length > 1 ? sortedMessages[1] : null;

        if (infoMessage && infoMessage.author.bot) {
          // Extract the content and update only the model part
          const content = infoMessage.content;
          const updatedContent = content.replace(
            /model: [a-zA-Z0-9-]+/,
            `model: ${validatedModel}`,
          );

          if (content !== updatedContent) {
            await infoMessage.edit(updatedContent);
            this.logger.log(
              `Updated thread information with new model: ${validatedModel}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Could not update thread information: ${error.message}`,
        );
        // Don't fail the command if we can't update the thread info
      }

      // Public announcement with model change information
      return interaction.editReply(
        `\`\`\`\nmodel changed\nfrom: ${previousModel}\nto:   ${validatedModel}\n\`\`\``,
      );
    } catch (error) {
      this.logger.error(`Error changing model: ${error}`);
      return interaction.editReply(
        `Failed to change the model: ${error.message}`,
      );
    }
  }
}
