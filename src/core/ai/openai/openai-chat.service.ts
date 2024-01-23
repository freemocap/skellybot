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

  public create(chatId: string, config: OpenAiChatConfig) {
    this._storeConfig(chatId, config);
  }

  public async getAiResponse(chatId: string, humanMessage: string) {
    const config = this.configs.get(chatId);
    config.messages.push({ role: 'user', content: humanMessage });

    return await this.openai.chat.completions.create(config);
  }
  private async _createStream(config: OpenAiChatConfig) {
    // Start the stream by creating the completion with the config object
    const completion = await this.openai.chat.completions.create(config);

    // Return an async generator function
    return (async function* () {
      let fullResponse = ''; // Initialize a string to store the full response

      // @ts-ignore
      for await (const chunk of completion) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
          // Accumulate the response data
          const content = chunk.choices[0].delta.content;
          fullResponse += content;

          // Yield each content chunk for the caller to process in real-time
          yield { content, fullResponse: false };
        }
      }

      // Once the stream is finished, yield one last time with the full response
      yield { content: fullResponse, fullResponse: true };
    })();
  }
}
