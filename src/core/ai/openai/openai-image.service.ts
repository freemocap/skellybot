import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ImageGenerationDto } from './dto/image-generation.dto';
import { OpenaiSecretsService } from './openai-secrets.service';
import { ImagesResponse } from 'openai/resources';

@Injectable()
export class OpenaiImageService implements OnModuleInit {
  private openai: OpenAI;

  constructor(
    private readonly _openAiSecrets: OpenaiSecretsService,
    private readonly _logger: Logger,
  ) {}

  async onModuleInit() {
    try {
      const apiKey = await this._openAiSecrets.getOpenaiApiKey();
      this.openai = new OpenAI({ apiKey: apiKey });
    } catch (error) {
      this._logger.error('Failed to initialize OpenAI service.', error);
      throw error;
    }
  }

  public async generateImage(
    dto: ImageGenerationDto,
  ): Promise<ImagesResponse | Error> {
    try {
      const {
        prompt,
        user,
        model = 'dall-e-3',
        n = 1,
        quality = 'standard',
        response_format = 'b64_json',
        size = '1024x1024',
        style = 'vivid',
      } = dto;

      const generationResponse: ImagesResponse | Error =
        await this.openai.images.generate({
          prompt,
          model,
          n,
          quality,
          response_format,
          size,
          style,
          user,
        });

      this._logger.log(`Image generated successfully.`);
      return generationResponse;
    } catch (error) {
      this._logger.error('Failed to generate image.', error);
      return error;
    }
  }
}
