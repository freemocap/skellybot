import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAiSecretsService } from '../openAiSecrets.service';
import { ChatPromptTemplate } from 'langchain/prompts';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { MongoDBChatMessageHistory } from '@langchain/community/dist/stores/message/mongodb';

@Injectable()
export class LangchainService {
  private _model: OpenAI<any>;
  private _chat_history_collection_name: string = 'chat-history';

  constructor(
    private readonly _openAiSecrets: OpenAiSecretsService,
    private readonly _logger: Logger,
  ) {}

  /**
   * Create a conversation chain that use MongoDBChatMessageHistory
   * Based on example from here: https://js.langchain.com/docs/integrations/chat_memory/mongodb#usage
   * @param modelName
   */
  async createMongoMemoryChatChain(chatId: string, modelName?: string) {
    const model = await this._createModel(modelName);
    const prompt = await this._createPrompt();
    const memory = await this._createMemory(chatId);
    return new ConversationChain({
      llm: model,
      prompt: prompt,
      memory: memory,
    });
  }

  /**
   * Creates a chain that may be invoked later.
   * @param modelName
   */
  async createChain(modelName?: string) {
    const model = await this._createModel(modelName);
    const promptTemplate = await this._createPrompt();
    return promptTemplate.pipe(model);
  }

  /**
   * Creates a model instance.
   *
   * The model instance is generated as a singleton. Subsequent calls reuse previously created model.
   *
   * @param {string} [modelName] - The name of the model. If not provided, the default model name 'gpt-4-1106-preview' will be used.
   * @private
   * @returns {Promise<OpenAI>} - A Promise that resolves to the created model instance.
   */
  private async _createModel(modelName?: string) {
    if (!this._model) {
      this._logger.log('Creating model...');
      this._model = new OpenAI({
        modelName: modelName || 'gpt-4-1106-preview',
        openAIApiKey: await this._openAiSecrets.getOpenAIKey(),
      });
    }
    this._logger.log('Returning model: ' + this._model.modelName);
    return this._model;
  }

  private async _createPrompt() {
    const promptStructure = [
      ['system', 'You were having a conversation with a human about {topic}'],
      ['human', '{text}'],
    ];

    // @ts-ignore
    const template = ChatPromptTemplate.fromMessages(promptStructure);
    this._logger.log('Creating prompt...', promptStructure);
    return template;
  }

  private async _createMemory(chatId) {
    this._logger.log(`Creating memory for chatId ${chatId}`);
    const memory = new BufferMemory({
      chatHistory: new MongoDBChatMessageHistory({
        collection: this._chat_history_collection_name,
        sessionId: chatId,
      }),
    });
    return memory;
  }
}
