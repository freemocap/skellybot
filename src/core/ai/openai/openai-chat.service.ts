import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { OpenAI } from 'openai';
import { AiChatDocument } from '../../database/collections/ai-chats/ai-chat.schema';
import { LangchainChatbot } from '../../chatbot/chatbot.dto';

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

  public getAiResponseStream(chatId: string, humanMessage: string) {
    const config = this.configs.get(chatId);
    config.messages.push({ role: 'user', content: humanMessage });

    return this.streamResponse(config);
  }

  public async getAiResponse(chatId: string, humanMessage: string) {
    const config = this.configs.get(chatId);
    config.messages.push({ role: 'user', content: humanMessage });
    return await this.openai.chat.completions.create(config);
  }
  async *streamResponse(chatConfig: OpenAiChatConfig) {
    const chatStream = await this.openai.chat.completions.create(chatConfig);

    const allStreamedChunks = [];
    let fullAiResponseText = '';

    // @ts-ignore
    for await (const newChunk of chatStream) {
      // the full message
      allStreamedChunks.push(newChunk);
      fullAiResponseText += newChunk.choices[0].delta.content;
      const chunkText = newChunk.choices[0].delta.content;
      this.logger.debug(`Streaming text chunk: ${chunkText}`);
      yield chunkText;
    }

    this.logger.log('Stream complete');

    chatConfig.messages.push({
      role: 'assistant',
      content: fullAiResponseText,
    });
  }

  async reloadChat(aiChat: AiChatDocument) {
    const chatConfig = this._createChatConfigFromAiChatDocument(aiChat);
    this._storeConfig(aiChat.aiChatId, chatConfig);
  }

  private _createChatConfigFromAiChatDocument(aiChat: AiChatDocument) {
    const chatConfig = {
      messages: [],
      model: aiChat.modelName || 'gpt-4-1106-preview',
      temperature: 0.7,
      stream: true,
    } as OpenAiChatConfig;

    chatConfig.messages.push({
      role: 'system',
      content: aiChat.contextInstructions,
    });

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
