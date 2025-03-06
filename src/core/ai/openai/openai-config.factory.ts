// src/core/ai/openai/openai-config.factory.ts
import { Injectable, Logger } from '@nestjs/common';
import { OpenAiChatConfig } from './openai-chat.service';

export type OpenAIModelType =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4'
  | 'o1-mini'
  | 'o1';

interface ModelConfig {
  maxTokens: number;
  defaultTemperature: number;
  supportsStreaming: boolean;
}

@Injectable()
export class OpenaiConfigFactory {
  private readonly logger = new Logger(OpenaiConfigFactory.name);
  private readonly modelConfigs: Record<OpenAIModelType, ModelConfig> = {
    'gpt-4o': {
      maxTokens: 16384,
      defaultTemperature: 0.7,
      supportsStreaming: true,
    },
    'gpt-4o-mini': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
    },
    'gpt-4': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
    },
    'o1-mini': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
    },
    o1: {
      maxTokens: 8192,
      defaultTemperature: 0.7,
      supportsStreaming: true,
    },
  };

  getConfigForModel(model: OpenAIModelType): OpenAiChatConfig {
    const modelConfig = this.modelConfigs[model] || this.modelConfigs['gpt-4o'];
    this.logger.debug(`Creating config for model: ${model}`);

    return {
      messages: [],
      model,
      temperature: modelConfig.defaultTemperature,
      stream: modelConfig.supportsStreaming,
      max_tokens: modelConfig.maxTokens,
    };
  }

  validateConfig(config: OpenAiChatConfig): OpenAiChatConfig {
    const model = config.model as OpenAIModelType;
    const modelConfig = this.modelConfigs[model] || this.modelConfigs['gpt-4o'];

    // Clone to avoid modifying the original
    const validatedConfig = { ...config };

    // Ensure max_tokens doesn't exceed the model's limit
    if (validatedConfig.max_tokens > modelConfig.maxTokens) {
      this.logger.warn(
        `Requested max_tokens (${validatedConfig.max_tokens}) exceeds limit for ${model}. ` +
          `Adjusting to ${modelConfig.maxTokens}.`,
      );
      validatedConfig.max_tokens = modelConfig.maxTokens;
    }

    return validatedConfig;
  }
}
