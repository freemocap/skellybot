import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { OpenAI } from 'openai';
import { AiChatDocument } from '../../database/collections/ai-chats/ai-chat.schema';

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
  private _configs: Map<string, OpenAiChatConfig> = new Map();

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
    config: OpenAiChatConfig,
  ) {
    config.messages.push({ role: 'system', content: systemPrompt });
    this.logger.debug(
      `Creating chat with id: ${chatId} and config: ${JSON.stringify(
        config,
        null,
        2,
      )}`,
    );
    this._storeConfig(chatId, config);
  }

  public getAiResponseStream(
    chatId: string,
    humanMessage: string,
    imageURLs: string[],
  ) {
    this.logger.debug(`Getting AI response stream for chatId: ${chatId}`);
    const config = this._getConfigOrThrow(chatId);
    const messageContent: any[] = [{ type: 'text', text: humanMessage }];
    for (const imageURL of imageURLs) {
      messageContent.push({ type: 'image_url', image_url: imageURL });
    }

    config.messages.push({ role: 'user', content: messageContent });

    return this.streamResponse(config);
  }

  public async getAiResponse(chatId: string, humanMessage: string) {
    const config = this._getConfigOrThrow(chatId);
    config.messages.push({ role: 'user', content: humanMessage });
    return await this.openai.chat.completions.create(config);
  }
  async *streamResponse(chatConfig: OpenAiChatConfig) {
    const chatStream = await this.openai.chat.completions.create(chatConfig);

    const allStreamedChunks = [];
    let fullAiResponseText = '';
    let chunkToYield = '';
    const yieldAtLength = 100;
    // @ts-ignore
    for await (const newChunk of chatStream) {
      allStreamedChunks.push(newChunk);
      fullAiResponseText += newChunk.choices[0].delta.content;
      const chunkText = newChunk.choices[0].delta.content;
      if (chunkText) {
        chunkToYield += chunkText;
      }
      if (
        chunkToYield.length >= yieldAtLength ||
        newChunk.choices[0].finish_reason === 'stop'
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
    this.createChat(
      aiChat.aiChatId,
      aiChat.contextInstructions,
      this._defaultChatConfig(),
    );
    this._reloadMessageHistoryFromAiChatDocument(aiChat);
  }

  private _defaultChatConfig() {
    return {
      messages: [],
      model: 'gpt-4-vision-preview',
      temperature: 0.7,
      stream: true,
    } as OpenAiChatConfig;
  }
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
