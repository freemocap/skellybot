import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenAI } from 'openai';
import { TextGenerationDto } from './dto/text-generation.dto';
import { OpenaiSecretsService } from './openai-secrets.service';
import { ChatCompletion } from 'openai/src/resources/chat/completions';

@Injectable()
export class OpenaiTextGenerationService implements OnModuleInit {
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

  public async generateText(dto: TextGenerationDto): Promise<string> {
    try {
      const { prompt, temperature, max_tokens, model } = dto;
      this._logger.log(`Generating text...`);
      const chatCompletionResponse: ChatCompletion =
        await this.openai.chat.completions.create({
          model,
          temperature,
          max_tokens,
          messages: [{ role: 'system', content: prompt }],
        });

      this._logger.log(`Text generation complete.`);
      return chatCompletionResponse.choices[0].message.content;
    } catch (error) {
      this._logger.error('Failed to generate image.', error);
      throw error;
    }
  }
}
