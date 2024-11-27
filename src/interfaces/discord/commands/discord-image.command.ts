import { Injectable } from '@nestjs/common';
import {
  BooleanOption,
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
} from 'necord';
import { OpenaiImageService } from '../../../core/ai/openai/openai-image.service';
import OpenAI from 'openai';
import { AttachmentBuilder } from 'discord.js';
import ImagesResponse = OpenAI.ImagesResponse;
import { OpenaiTextGenerationService } from '../../../core/ai/openai/openai-text.service';

export class ImagePromptDto {
  @StringOption({
    name: 'prompt',
    description: 'Starting text for the chat',
    required: false,
  })
  prompt: string = 'Generate a new image';

  @BooleanOption({
    name: 'use_context',
    description:
      'Whether to include text from this Thread/Channel in the image generation prompt',
    required: false,
  })
  useContext: boolean;
}

@Injectable()
export class DiscordImageCommand {
  constructor(
    private readonly _openaiImageService: OpenaiImageService,
    private readonly _openaiTextService: OpenaiTextGenerationService,
  ) {}

  @SlashCommand({
    name: 'image',
    description:
      'Generate an image based on the text in this context (thread, channel, etc)',
  })
  public async handleImageCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) imagePromptDto?: ImagePromptDto,
  ) {
    await interaction.deferReply();
    let promptText = '';
    if (!imagePromptDto || !imagePromptDto.prompt) {
      promptText = 'Generate a new image';
    } else {
      promptText = imagePromptDto.prompt;
    }
    if (imagePromptDto && imagePromptDto.useContext) {
      const context = interaction.channel;
      const messages = await context.messages.fetch();
      const contextText = messages
        .map((message) => message.content)
        .join(' \n ');

      let promptInstructions =
        'Condense the provided INPUT TEXT into a 200 word (or less) prompt that will be used to generate an image. Do not generate any text other than the image generation prompt';
      if (imagePromptDto && imagePromptDto.prompt) {
        promptInstructions = imagePromptDto.prompt;
      }
      promptText = await this._openaiTextService.generateText({
        prompt: `${promptInstructions}.\n\n--------BEGIN INPUT TEXT\n\n ${contextText} \n\n ---------------END OF INPUT TEXT\n\nREMEMBER! Your task is toyeah,  ${promptInstructions}.`,
        model: 'gpt-4o',
        temperature: 0.5,
        max_tokens: 300,
      });
    }
    await interaction.editReply({
      content: `Generating image from prompt:\n > ${promptText} \n\n Please wait...`,
    });
    //  generate image
    const response: ImagesResponse =
      await this._openaiImageService.generateImage({
        prompt: promptText,
        user: interaction.user.id,
      });

    const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
    const imageAttachment = new AttachmentBuilder(imageBuffer, {
      name: 'image.png',
    });
    await interaction.editReply({
      content: `Image generated from prompt:\n > ${promptText}`,
      files: [imageAttachment],
    });
  }
}
