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
  constructor(private readonly _openaiImageService: OpenaiImageService) {}

  @SlashCommand({
    name: 'image',
    description:
      'Generate an image based on the text in this context (thread, channel, etc)',
    guilds: ['1198365355698028595'],
  })
  public async handleImageCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) imagePromptDto?: ImagePromptDto,
  ) {
    let promptText = '';
    if (!imagePromptDto || !imagePromptDto.prompt) {
      promptText = 'Generate a new image';
    } else {
      promptText = imagePromptDto.prompt;
    }
    if (imagePromptDto.useContext) {
      const context = interaction.channel;
      const messages = await context.messages.fetch();
      const contextText = messages
        .map((message) => message.content)
        .join(' \n ');
      promptText = `${promptText} \n\n ${contextText}`;
    }
    await interaction.reply({
      content: `Generating image from prompt:\n > ${promptText} \n Generating image...`,
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
