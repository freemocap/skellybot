import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { OpenaiSecretsService } from './openai-secrets.service';
import { z } from 'zod';
import { OpenaiConfigFactory, OpenAIModelType } from './openai-config.factory';

@Injectable()
export class OpenaiAnalysisService {
  private readonly logger = new Logger(OpenaiAnalysisService.name);

  constructor(
    private readonly _openAiSecrets: OpenaiSecretsService,
    private readonly _configFactory: OpenaiConfigFactory,
  ) {}

  private async getOpenAIClient(model: OpenAIModelType): Promise<OpenAI> {
    const modelConfig = this._configFactory.modelConfigs[model];
    const apiKey = await this._openAiSecrets.getApiKeyForModel(model);

    this.logger.debug(`Creating client for model ${model}`);

    if (modelConfig?.baseUrl) {
      this.logger.debug(`Using custom baseURL: ${modelConfig.baseUrl}`);
      return new OpenAI({
        apiKey,
        baseURL: modelConfig.baseUrl,
      });
    }

    this.logger.debug('Using default OpenAI baseURL');
    return new OpenAI({ apiKey });
  }

  async summarizeChat(messages: any[]) {
    this.logger.debug('Summarizing chat with messages');
    const model: OpenAIModelType = 'gpt-4o-mini';

    try {
      const client = await this.getOpenAIClient(model);

      // Define the schema for structured output
      const summarizeSchema = z
        .object({
          title: z
            .string()
            .describe(
              'A very concise, but creative title (max 7 words) that captures the essence of this conversation.',
            ),
          summary: z
            .string()
            .describe(
              'A brief single-sentence summary that captures the main topic and purpose of the conversation',
            ),
          emojis: z
            .string()
            .describe(
              'Up to two relevant emojis (e.g. "🙄🚬" that represent the topics or sentiment of the conversation',
            ),
        })
        .strict();

      // Create the system message for the summarization task
      const systemMessage = `
  You are an expert conversation analyst.
  Your task is to analyze the provided chat history and create a concise title and summary, following the provided json schema.
  Follow these guidelines:
  - The title must be very short (maximum 7 words)
  - The summary should be a single, concise sentence
  - Focus on the topics involved, more than a strict description
  - Pay more attention to the actual conversation between the user and assistant, letting system messages be for background context
  - Pick up to 2 emojis and provide them concatenated into a single string.
  `;

      // Create the formatted messages for API request
      const formattedMessages = [
        { role: 'system', content: systemMessage },
        {
          role: 'user',
          content: 'Please summarize the following conversation:',
        },
        ...messages.map((msg) => ({
          role: msg.role,
          content:
            typeof msg.content === 'string'
              ? msg.content
              : JSON.stringify(msg.content),
        })),
      ];

      // Make the API request with structured output format
      const completion = await client.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      // Parse and validate the response using Zod
      const response = completion.choices[0].message.content;
      this.logger.debug(`Got summarization response: ${response}`);

      const parsedResponse = JSON.parse(response);
      return summarizeSchema.parse(parsedResponse);
    } catch (error) {
      this.logger.error(
        `Error summarizing chat: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
