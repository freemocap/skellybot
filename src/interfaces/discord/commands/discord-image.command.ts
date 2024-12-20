import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { OpenaiImageService } from '../../../core/ai/openai/openai-image.service';
import OpenAI from 'openai';
import {
  AttachmentBuilder,
  CacheType,
  ChatInputCommandInteraction,
} from 'discord.js';
import { OpenaiTextGenerationService } from '../../../core/ai/openai/openai-text.service';
import { ImagePromptDto } from './image-prompt.dto';
import ImagesResponse = OpenAI.ImagesResponse;

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
    @Options({ required: true }) imagePromptDto?: ImagePromptDto,
  ) {
    await interaction.deferReply();
    const promptText = await this.generatePrompt(imagePromptDto, interaction);
    const initialMessageText = await this.sendInitialReply(
      promptText,
      interaction,
    );

    //  generate image
    const response: ImagesResponse | Error =
      await this._openaiImageService.generateImage({
        prompt: promptText,
        user: interaction.user.id,
        style: imagePromptDto.naturalStyle ? 'natural' : 'vivid',
      });

    if (response instanceof Error) {
      await interaction.editReply({
        content: `Error generating image for prompt ${promptText}: \n Error response:\n\n ${response.message}`,
      });
      return;
    }

    if (!response.data || response.data.length === 0) {
      await interaction.editReply({
        content: `No image was generated from the prompt:\n > ${promptText} `,
      });
      return;
    }

    const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
    const imageAttachment = new AttachmentBuilder(imageBuffer, {
      name: 'image.png',
    });

    await interaction.editReply({
      content: `${initialMessageText} Revised Prompt: \n > ${response.data[0].revised_prompt}`,
      files: [imageAttachment],
    });
  }

  private async sendInitialReply(
    promptText: string,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    const pleaseWaitText = 'Generating Image, Please wait...';
    const initialMessageText = `Original Prompt:\n > ${promptText} \n\n`;
    await interaction.editReply({
      content: `${initialMessageText} ${pleaseWaitText}`,
    });
    return initialMessageText;
  }

  private async generatePrompt(
    imagePromptDto: ImagePromptDto,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    let promptText = imagePromptDto.prompt;
    let contextText = '';
    if (imagePromptDto && imagePromptDto.useContext) {
      contextText = await this.get_context_text(interaction, imagePromptDto);
      promptText = `${promptText}\n${contextText} \n ${promptText}`;
    }

    if (promptText.length > 200) {
      promptText = await this.condenseText(contextText);
    }

    if (imagePromptDto.useExactPrompt) {
      // the instructions on how to disable the revise prompt feature literally say to append this text to the prompt lol: https://platform.openai.com/docs/guides/images#prompting
      const dontReviseTextPrompt =
        'I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS:';
      promptText = `${dontReviseTextPrompt} \n ${promptText}`;
    }
    return promptText;
  }

  private async condenseText(contextText: string) {
    const promptInstructions =
      'Condense the provided INPUT TEXT into a 200 word (or less) prompt that will be used to generate an image. Do not generate any text other than the image generation prompt';

    return await this._openaiTextService.generateText({
      prompt: `${promptInstructions}.\n\n--------BEGIN INPUT TEXT\n\n ${contextText} \n\n ---------------END OF INPUT TEXT\n\nREMEMBER! Your task is toyeah,  ${promptInstructions}.`,
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 300,
    });
  }

  private async get_context_text(
    interaction: ChatInputCommandInteraction<CacheType>,
    imagePromptDto: ImagePromptDto,
  ) {
    const context = interaction.channel;
    const contextLength = imagePromptDto.contextLength || 5;
    const messages = await context.messages.fetch();

    if (contextLength === -1) {
      return messages.map((message) => message.content).join(' \n ');
    } else {
      const messageArray = Array.from(messages.values());
      return messageArray
        .slice(0, contextLength)
        .map((message) => message.content)
        .join(' \n ');
    }
  }
}
