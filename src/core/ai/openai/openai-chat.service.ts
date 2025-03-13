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
  'o1',
  'deepseek-chat',
  'deepseek-reasoner',
] as const;

export interface OpenAiChatConfig {
  messages: any[];
  model: (typeof AVAILABLE_MODELS)[number];
  temperature?: number;
  stream: boolean;
  max_tokens?: number;
  max_completion_tokens?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  top_p?: number;
}

@Injectable()
export class OpenaiChatService implements OnModuleInit {
  private readonly logger = new Logger(OpenaiChatService.name);
  // private openai: OpenAI;
  private _configs: Map<string, OpenAiChatConfig> = new Map();

  constructor(
    private readonly _openAiSecrets: OpenaiSecretsService,
    private readonly _configFactory: OpenaiConfigFactory,
  ) {}

  async onModuleInit() {
    // Just verify we can get an API key, but don't create a client yet
    try {
      await this._openAiSecrets.getOpenaiApiKey();
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI service.', error);
      throw error;
    }
  }

  public getAvailableLLMs(): string[] {
    return [...AVAILABLE_MODELS];
  }

  // In OpenaiChatService.ts
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

  // src/core/ai/openai/openai-config.factory.ts

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

    // Add the system message - always as 'system' role in storage
    // (transformation happens only at API call time)
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
    imageURLs: string[] = [],
  ) {
    this.logger.debug(`Getting AI response stream for chatId: ${chatId}`);
    const config = this._getConfigOrThrow(chatId);

    this.logger.log(
      `Using OpenAI config for chatId ${chatId}: ${JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        max_completion_tokens: config.max_completion_tokens,
        message_count: config.messages.length,
      })}`,
    );

    const messageContent: any[] = [{ type: 'text', text: humanMessage }];
    for (const imageURL of imageURLs) {
      messageContent.push({ type: 'image_url', image_url: { url: imageURL } });
    }

    config.messages.push({ role: 'user', content: messageContent });

    // Clone the config before passing to streamResponse
    // to avoid modifying the stored configuration
    const requestConfig = { ...config };

    // Apply model-specific transformations
    requestConfig.messages = this._configFactory.transformMessagesForModel(
      config.messages,
      config.model as OpenAIModelType,
    );

    return this.streamResponse(requestConfig, chatId);
  }

  public async getAiResponse(chatId: string, humanMessage: string) {
    const config = this._getConfigOrThrow(chatId);

    this.logger.log(
      `Using OpenAI config for chatId ${chatId}: ${JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        max_completion_tokens: config.max_completion_tokens,
        message_count: config.messages.length,
      })}`,
    );

    config.messages.push({ role: 'user', content: humanMessage });

    // Clone and transform the config for API compatibility
    const requestConfig = { ...config };
    requestConfig.messages = this._configFactory.transformMessagesForModel(
      config.messages,
      config.model as OpenAIModelType,
    );

    // Get the appropriate client
    const client = await this.getOpenAIClient(config.model as OpenAIModelType);
    return await client.chat.completions.create(requestConfig);
  }

  async *streamResponse(chatConfig: OpenAiChatConfig, chatId: string) {
    const client = await this.getOpenAIClient(
      chatConfig.model as OpenAIModelType,
    );
    const chatStream = await client.chat.completions.create(chatConfig);

    let fullAiResponseText = '';
    let fullReasoningText = '';
    let chunkToYield = '';
    const yieldAtLength = 100;

    let isInReasoningMode = false;

    // @ts-expect-error - TS doesn't know about async generators yet
    for await (const newChunk of chatStream) {
      const hasReasoningContent = !!newChunk.choices[0].delta.reasoning_content;
      const hasRegularContent = !!newChunk.choices[0].delta.content;

      // Start reasoning mode
      if (!isInReasoningMode && hasReasoningContent) {
        isInReasoningMode = true;
        yield '```\n<think>\n\n';
      }

      // Process reasoning content
      if (hasReasoningContent) {
        const reasoningChunk = newChunk.choices[0].delta.reasoning_content;
        fullReasoningText += reasoningChunk;
        chunkToYield += reasoningChunk;
      }

      // Transition from reasoning to answer
      if (isInReasoningMode && !hasReasoningContent && hasRegularContent) {
        isInReasoningMode = false;

        if (chunkToYield.length > 0) {
          yield chunkToYield;
          chunkToYield = '';
        }

        yield '\n\n</think>\n```\n';
      }

      // Process regular content
      if (hasRegularContent) {
        const contentText = newChunk.choices[0].delta.content;
        fullAiResponseText += contentText;
        chunkToYield += contentText;
      }

      // Yield chunks at reasonable intervals
      if (
        (chunkToYield.length >= yieldAtLength &&
          chunkToYield.slice(-1).match(/[\s,.!?]/)) ||
        newChunk.choices[0].finish_reason
      ) {
        yield chunkToYield;
        chunkToYield = '';
      }
    }

    // Yield any remaining content
    if (chunkToYield.length > 0) {
      yield chunkToYield;
    }

    this.logger.log('Stream complete');

    // Format and store the final message
    let finalResponse = fullAiResponseText;
    if (chatConfig.model === 'deepseek-reasoner' && fullReasoningText) {
      finalResponse = `\`\`\`\n<think>\n${fullReasoningText}\n</think>\n\`\`\`\n${fullAiResponseText}`;
    }

    // Update stored messages
    const config = this._getConfigOrThrow(chatId);
    config.messages.push({
      role: 'assistant',
      content: finalResponse,
    });

    // Emit an event or return a value indicating completion
    return {
      complete: true,
      messages: [...config.messages],
    };
  }

  // Add to OpenaiChatService class
  public getChatMessages(chatId: string) {
    const config = this._getConfigOrThrow(chatId);
    return [...config.messages]; // Return a copy to prevent modification
  }

  async reloadChat(aiChat: AiChatDocument) {
    const model = (aiChat.modelName as OpenAIModelType) || 'gpt-4o';
    const config = this._configFactory.getConfigForModel(model);

    // Create chat will handle role transformations as needed
    this.createChat(aiChat.aiChatId, aiChat.contextInstructions, config);
    this._reloadMessageHistoryFromAiChatDocument(aiChat);
  }
  private _reloadMessageHistoryFromAiChatDocument(aiChat: AiChatDocument) {
    const chatConfig = this._getConfigOrThrow(aiChat.aiChatId);

    // We add messages in their standard form, transformations happen at API call time
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
