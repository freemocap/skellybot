import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { OpenAI } from 'openai';

export interface OpenAiChatConfig {
  //https://platform.openai.com/docs/api-reference/chat
  messages: any[];
  model:
    | 'gpt-4-1106-preview'
    | 'gpt-4'
    | 'gpt-4-vision-preview'
    | 'gpt-4-32k'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k';
  temperature: number;
  stream: boolean;
}

@Injectable()
export class OpenaiChatService implements OnModuleInit {
  private readonly logger = new Logger(OpenaiChatService.name);
  private openai: OpenAI;
  private configs: Map<string, OpenAiChatConfig> = new Map();

  constructor(private readonly _openAiSecrets: OpenaiSecretsService) {}

  // OnModuleInit lifecycle hook
  async onModuleInit() {
    try {
      const apiKey = await this._openAiSecrets.getOpenaiApiKey();
      this.openai = new OpenAI({ apiKey: apiKey });
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI service.', error);
      throw error;
    }
  }
  private _storeConfig(chatbotId: string, config: OpenAiChatConfig) {
    this.configs.set(chatbotId, config);
  }

  async create(chatId: string, systemPrompt: string, config: OpenAiChatConfig) {
    this._storeConfig(chatId, config);
    config.messages.push({ role: 'system', content: systemPrompt });
    if (config.stream) {
      return this._createStream(config);
    } else {
      return this._createCompletion(config);
    }
  }

  private async _createStream(config: OpenAiChatConfig) {
    const completion = await this.openai.chat.completions.create(config);
    return async function* generateResponses() {
      // @ts-ignore
      for await (const chunk of completion) {
        yield chunk.choices[0].delta.content;
      }
      return completion;
    };
  }

  private async _createCompletion(config: OpenAiChatConfig) {
    const completion = await this.openai.chat.completions.create(config);
    return completion;
  }
}
