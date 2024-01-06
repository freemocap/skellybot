import { Inject, Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { ChatPromptTemplate } from 'langchain/prompts';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { OpenaiSecretsService } from '../openai/openai-secrets.service';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConnectionService } from '../../database/database-connection.service';
import { MongoDBChatMessageHistory } from '@langchain/community/stores/message/mongodb';
import * as mongoose from 'mongoose';

@Injectable()
export class LangchainService {
  private _model: OpenAI<any>;
  private readonly _chatHistoryCollectionName = 'chat-history';

  constructor(
    @Inject(getConnectionToken()) private connection: Connection,
    private readonly _openAiSecrets: OpenaiSecretsService,
    private readonly _databaseConnectionService: DatabaseConnectionService,
    private readonly _logger: Logger,
  ) {}

  /**
   * Create a conversation chain that use MongoDBChatMessageHistory
   * Based on example from here: https://js.langchain.com/docs/integrations/chat_memory/mongodb#usage
   * @param modelName
   */
  async createMongoMemoryChatChain(modelName?: string) {
    const model = await this._createModel(modelName);
    const prompt = await this._createPrompt();
    const memory = await this._createMemory();
    this._logger.log(`Returning chain with model ${this._model.modelName}`);
    return new ConversationChain({
      llm: model,
      prompt: prompt,
      memory: memory,
    });

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

  private async _createMemory() {
    this._logger.log(`Creating MongoDB connected chat-history for chatbot...`);

    const sessionId = new mongoose.Types.ObjectId().toString();
    const connection = await this._databaseConnectionService.getConnection();
    const collection = connection.db.collection(
      this._chatHistoryCollectionName,
    );
    const memory = new BufferMemory({
      chatHistory: new MongoDBChatMessageHistory({
        // @ts-ignore
        collection: collection,
        sessionId: sessionId,
      }),
    });
    this._logger.log(`Chat-history created!`);
    return memory;
  }
}
