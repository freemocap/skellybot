import { OpenaiSecretsService } from './openai-secrets.service';
import { OpenAI } from 'openai';
import { promises } from 'fs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TextToSpeechDto } from './dto/text-to-speech.dto';
import * as path from 'path';
import { SpeechToTextDto } from './dto/speech-to-text.dto';

@Injectable()
export class OpenaiAudioService implements OnModuleInit {
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
      throw error; // Rethrow the error to prevent the module from initializing incorrectly.
    }
  }

  public async createAudioTranscription(speechToTextDto: SpeechToTextDto) {
    try {
      const { file, model, language, prompt, response_format, temperature } =
        speechToTextDto;

      const transcriptionResponse =
        await this.openai.audio.transcriptions.create({
          file: file,
          model: model,
          language: language,
          prompt: prompt,
          response_format: response_format || 'verbose_json', // Set default value if undefined
          temperature: temperature || 0, // Set default value if undefined
        });

      this._logger.log(`Received transcription: ${transcriptionResponse.text}`);
      return transcriptionResponse;
    } catch (error) {
      this._logger.error('Failed to create audio transcription.', error);
      throw error;
    }
  }

  public async textToSpeech(dto: TextToSpeechDto, outputPath: string) {
    try {
      const { model, input, voice, response_format, speed } = dto;

      const response = await this.openai.audio.speech.create({
        model: model,
        input: input,
        voice: voice,
        response_format: response_format || 'mp3', // Set default value if undefined
        speed: speed || 1, // Set default value if undefined
      });

      // Optionally log some information or handle the response metadata
      this._logger.log(`Generating speech file at: ${outputPath}`);

      // Convert the response to a buffer, write it to a file
      const buffer = Buffer.from(await response.arrayBuffer());
      const resolvedPath = path.resolve(outputPath);
      await promises.writeFile(resolvedPath, buffer);

      // Return the resolved path where the speech file has been saved
      return resolvedPath;
    } catch (error) {
      this._logger.error('Failed to create text-to-speech audio.', error);
      throw error;
    }
  }
}
