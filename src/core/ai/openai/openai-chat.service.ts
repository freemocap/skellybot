import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { OpenAI } from 'openai';

@Injectable()
export class OpenaiChatService implements OnModuleInit {
  private readonly logger = new Logger(OpenaiChatService.name);
  private openai: OpenAI;

  constructor(private readonly _openAiSecrets: OpenaiSecretsService) {}

  // OnModuleInit lifecycle hook
  async onModuleInit() {
    try {
      const apiKey = await this._openAiSecrets.getOpenaiApiKey();
      this.openai = new OpenAI({ apiKey: apiKey });
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI service.', error);
      throw error; // Rethrow the error to prevent the module from initializing incorrectly.
    }
  }

  async createChatCompletion(model: string = 'gpt4-1106-preview') {
    try {
      return await this.openai.chat.completions.create({
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
        model: model,
      });
    } catch (error) {
      this.logger.error('Failed to create chat completion.', error);
      throw error; // Rethrow the error or handle it accordingly.
    }
  }

  async streamChatCompletion(
    model: string = 'gpt4-1106-preview',
    additionalArgs: any = {},
  ) {
    try {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hi, how are you?' },
      ];

      const completionStream = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        ...additionalArgs, // Include any additional arguments
        stream: true, // Ensure streaming is enabled
      });

      async function* generateResponses() {
        // @ts-ignore
        for await (const chunk of completionStream) {
          const responseContent = chunk?.choices?.[0]?.delta?.content;
          if (responseContent) {
            yield responseContent;
          }
        }
      }

      // Return the generator function
      return generateResponses();
    } catch (error) {
      this.logger.error('Failed to stream chat completion.', error);
      throw error; // Rethrow the error or decide on a recovery strategy.
    }
  }
}
