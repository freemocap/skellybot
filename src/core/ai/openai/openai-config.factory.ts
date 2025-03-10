// src/core/ai/openai/openai-config.factory.ts
import { Injectable, Logger } from '@nestjs/common';
import { OpenAiChatConfig } from './openai-chat.service';

export type OpenAIModelType =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4'
  | 'o1'
  | 'deepseek-chat'
  | 'deepseek-reasoner';

export type ModelFamily = 'standard' | 'reasoning';

export interface ModelConfig {
  maxTokens: number;
  defaultTemperature: number;
  supportsStreaming: boolean;
  modelFamily: ModelFamily;
  parameters: Record<string, any>;
  baseUrl?: string; // Add this field
}

@Injectable()
export class OpenaiConfigFactory {
  private readonly logger = new Logger(OpenaiConfigFactory.name);
  readonly modelConfigs: Record<OpenAIModelType, ModelConfig> = {
    'gpt-4o': {
      maxTokens: 16384,
      defaultTemperature: 0.7,
      supportsStreaming: true,
      modelFamily: 'standard',
      parameters: {
        temperature: 0.7,
        max_tokens: 16384,
      },
    },
    'gpt-4o-mini': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
      modelFamily: 'standard',
      parameters: {
        temperature: 0.7,
        max_tokens: 4096,
      },
    },
    'gpt-4': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
      modelFamily: 'standard',
      parameters: {
        temperature: 0.7,
        max_tokens: 4096,
      },
    },
    o1: {
      maxTokens: 8192,
      defaultTemperature: 0.7,
      supportsStreaming: true,
      modelFamily: 'reasoning',
      parameters: {
        max_completion_tokens: 8192,
        reasoning_effort: 'medium',
      },
    },
    'deepseek-chat': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
      modelFamily: 'standard',
      baseUrl: 'https://api.deepseek.com', // Add Deepseek base URL
      parameters: {
        temperature: 0.7,
        max_tokens: 4096,
      },
    },
    'deepseek-reasoner': {
      maxTokens: 4096,
      defaultTemperature: 0.7,
      supportsStreaming: true,
      modelFamily: 'standard',
      baseUrl: 'https://api.deepseek.com', // Add Deepseek base URL
      parameters: {
        temperature: 0.7,
        max_tokens: 4096,
      },
    },
  };

  getConfigForModel(model: OpenAIModelType): OpenAiChatConfig {
    const modelConfig = this.modelConfigs[model] || this.modelConfigs['gpt-4o'];
    this.logger.debug(`Creating config for model: ${model}`);

    // Create base config
    const baseConfig: OpenAiChatConfig = {
      messages: [],
      model,
      temperature: modelConfig.defaultTemperature,
      stream: modelConfig.supportsStreaming,
      max_tokens: modelConfig.maxTokens, // This will be removed for reasoning models later
    };

    return this.applyModelSpecificParameters(baseConfig, model);
  }

  validateConfig(config: OpenAiChatConfig): OpenAiChatConfig {
    const model = config.model as OpenAIModelType;
    const modelConfig = this.modelConfigs[model] || this.modelConfigs['gpt-4o'];

    // Clone to avoid modifying the original
    const validatedConfig = { ...config };

    // For standard models, ensure max_tokens is within limits
    if (
      modelConfig.modelFamily === 'standard' &&
      validatedConfig.max_tokens > modelConfig.maxTokens
    ) {
      this.logger.warn(
        `Requested max_tokens (${validatedConfig.max_tokens}) exceeds limit for ${model}. ` +
          `Adjusting to ${modelConfig.maxTokens}.`,
      );
      validatedConfig.max_tokens = modelConfig.maxTokens;
    }

    return this.applyModelSpecificParameters(validatedConfig, model);
  }

  /**
   * Transforms a config object to match model-specific requirements
   */
  applyModelSpecificParameters(
    config: OpenAiChatConfig,
    model: OpenAIModelType,
  ): OpenAiChatConfig {
    const modelConfig = this.modelConfigs[model] || this.modelConfigs['gpt-4o'];
    // Create a new object to avoid modifying the original
    const transformedConfig = { ...config };

    if (modelConfig.modelFamily === 'reasoning') {
      // For o1 models:
      // 1. Remove unsupported parameters
      delete transformedConfig.temperature;
      delete transformedConfig.max_tokens;
      delete transformedConfig.top_p;

      // 2. Add reasoning model specific parameters
      transformedConfig.max_completion_tokens =
        modelConfig.parameters.max_completion_tokens;
      transformedConfig.reasoning_effort =
        modelConfig.parameters.reasoning_effort;
    } else {
      // For standard models, ensure we don't have reasoning model parameters
      delete transformedConfig.max_completion_tokens;
      delete transformedConfig.reasoning_effort;
      delete transformedConfig.top_p;
    }

    return transformedConfig;
  }

  /**
   * Transform messages for compatibility with the specified model
   */
  transformMessagesForModel(messages: any[], model: OpenAIModelType): any[] {
    const modelConfig = this.modelConfigs[model] || this.modelConfigs['gpt-4o'];

    // Create a new array to avoid modifying the original
    const transformedMessages = [...messages];

    // For reasoning models that support the developer role (currently only full o1)
    if (modelConfig.modelFamily === 'reasoning') {
      return transformedMessages.map((msg) => {
        if (msg.role === 'system') {
          return { ...msg, role: 'developer' };
        }
        return msg;
      });
    }

    return transformedMessages;
  }

  // Add this method to src/core/ai/openai/openai-config.factory.ts
  isReasoningModel(model: OpenAIModelType): boolean {
    const modelConfig = this.modelConfigs[model];
    return modelConfig?.modelFamily === 'reasoning';
  }
}
