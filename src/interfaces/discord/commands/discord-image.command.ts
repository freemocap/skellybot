import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { OpenaiImageService } from '../../../core/ai/openai/openai-image.service';

@Injectable()
export class DiscordImageCommand {
  private readonly logger = new Logger(DiscordImageCommand.name);

  constructor(private readonly openaiImageService: OpenaiImageService) {}

  @SlashCommand({
    name: 'imagine',
    description: 'Generate an image based on your description',
  })
  public async onImageCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    const prompt =
      interaction.options.getString('prompt', true) ||
      'A beautiful landscape';

    try {
      await interaction.deferReply();
      
      // Call generateImage with DTO object (single parameter)
      const response = await this.openaiImageService.generateImage({
        prompt,
        user: interaction.user.id,
        model: 'dall-e-3',
        n: 1,
        quality: 'standard',
        response_format: 'b64_json',
        size: '1024x1024',
        style: 'vivid',
      });

      if (response instanceof Error) {
        await interaction.editReply('Failed to generate image');
        return;
      }

      const imageUrl = (response as any).data[0]?.url;
      if (!imageUrl) {
        await interaction.editReply('Failed to generate image');
        return;
      }

      await interaction.editReply({
        content: `Generated image for: ${prompt}`,
        files: [{ attachment: imageUrl }],
      });
    } catch (error) {
      this.logger.error('Error generating image:', error);
      await interaction.editReply('Failed to generate image');
    }
  }
}
