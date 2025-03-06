// src/core/ai/openai/openai-chat.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { OpenAI } from 'openai';
import { AiChatDocument } from '../../database/collections/ai-chats/ai-chat.schema';
import { OpenaiConfigFactory, OpenAIModelType } from './openai-config.factory';

const AVAILABLE_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'o1-mini',
  'o1',
] as const;

export interface OpenAiChatConfig {
  messages: any[];
  model: (typeof AVAILABLE_MODELS)[number];
  temperature: number;
  stream: boolean;
  max_tokens: number;
}

@Injectable()
export class OpenaiChatService implements OnModuleInit {
  private readonly logger = new Logger(OpenaiChatService.name);
  private openai: OpenAI;
  private _configs: Map<string, OpenAiChatConfig> = new Map();

  constructor(
    private readonly _openAiSecrets: OpenaiSecretsService,
    private readonly _configFactory: OpenaiConfigFactory,
  ) {}

  async onModuleInit() {
    try {
      const apiKey = await this._openAiSecrets.getOpenaiApiKey();
      this.openai = new OpenAI({ apiKey: apiKey });
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI service.', error);
      throw error;
    }
  }

  public getAvailableLLMs(): string[] {
    return [...AVAILABLE_MODELS];
  }

  private _storeConfig(chatbotId: string, config: OpenAiChatConfig) {
    this._configs.set(chatbotId, config);
  }

  private _getConfigOrThrow(chatbotId: string) {
    const config = this._configs.get(chatbotId);
    if (!config) {
      throw new Error(`No config found for chatbotId: ${chatbotId}`);
    }
    return config;
  }

  public createChat(
    chatId: string,
    systemPrompt: string,
    config: Partial<OpenAiChatConfig> = {},
  ) {
    // Get default config based on model and validate it
    const model = config.model || 'gpt-4o';
    const baseConfig = this._configFactory.getConfigForModel(
      model as OpenAIModelType,
    );
    const mergedConfig = { ...baseConfig, ...config };
    const validatedConfig = this._configFactory.validateConfig(mergedConfig);

    validatedConfig.messages.push({ role: 'system', content: systemPrompt });

    this.logger.debug(
      `Creating chat with id: ${chatId} and config: ${JSON.stringify(
        validatedConfig,
        null,
        2,
      )}`,
    );

    this._storeConfig(chatId, validatedConfig);
  }

  public getAiResponseStream(
    chatId: string,
    humanMessage: string,
    imageURLs: string[],
  ) {
    this.logger.debug(`Getting AI response stream for chatId: ${chatId}`);
    const config = this._getConfigOrThrow(chatId);

    this.logger.log(
      `Using OpenAI config for chatId ${chatId}: ${JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        message_count: config.messages.length,
      })}`,
    );

    const messageContent: any[] = [{ type: 'text', text: humanMessage }];
    for (const imageURL of imageURLs) {
      messageContent.push({ type: 'image_url', image_url: { url: imageURL } });
    }

    config.messages.push({ role: 'user', content: messageContent });

    return this.streamResponse(config);
  }

  public async getAiResponse(chatId: string, humanMessage: string) {
    const config = this._getConfigOrThrow(chatId);

    this.logger.log(
      `Using OpenAI config for chatId ${chatId}: ${JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        message_count: config.messages.length,
      })}`,
    );

    config.messages.push({ role: 'user', content: humanMessage });
    return await this.openai.chat.completions.create(config);
  }

  async *streamResponse(chatConfig: OpenAiChatConfig) {
    const chatStream = await this.openai.chat.completions.create(chatConfig);

    const allStreamedChunks = [];
    let fullAiResponseText = '';
    let chunkToYield = '';
    const yieldAtLength = 100;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const newChunk of chatStream) {
      allStreamedChunks.push(newChunk);
      fullAiResponseText += newChunk.choices[0].delta.content || '';
      const chunkText = newChunk.choices[0].delta.content || '';
      if (chunkText) {
        chunkToYield += chunkText;
      }
      if (
        chunkToYield.length >= yieldAtLength ||
        newChunk.choices[0].finish_reason === 'stop' ||
        newChunk.choices[0].finish_reason === 'length'
      ) {
        this.logger.debug(`Streaming text chunk: ${chunkToYield}`);
        yield chunkToYield;
        chunkToYield = '';
      }
    }
    this.logger.log('Stream complete');

    chatConfig.messages.push({
      role: 'assistant',
      content: fullAiResponseText,
    });
  }

  async reloadChat(aiChat: AiChatDocument) {
    const model = (aiChat.modelName as OpenAIModelType) || 'gpt-4o';
    const config = this._configFactory.getConfigForModel(model);

    this.createChat(aiChat.aiChatId, aiChat.contextInstructions, config);
    this._reloadMessageHistoryFromAiChatDocument(aiChat);
  }

  // private _defaultChatConfig(model: string = 'gpt-4o'): OpenAiChatConfig {
  //   return this._configFactory.getConfigForModel(model as OpenAIModelType);
  // }

  private _reloadMessageHistoryFromAiChatDocument(aiChat: AiChatDocument) {
    const chatConfig = this._getConfigOrThrow(aiChat.aiChatId);

    for (const couplet of aiChat.couplets) {
      chatConfig.messages.push({
        role: 'user',
        content: couplet.humanMessage.content,
      });
      chatConfig.messages.push({
        role: 'assistant',
        content: couplet.aiResponse.content,
      });
    }
    return chatConfig;
  }
}
