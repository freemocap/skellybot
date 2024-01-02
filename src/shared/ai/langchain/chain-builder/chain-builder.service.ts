import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAiSecretsService } from '../openAiSecrets.service';
import { ChatPromptTemplate } from 'langchain/prompts';

@Injectable()
export class ChainBuilderService {
  private _model: OpenAI<any>;

  constructor(
    private readonly _openAiSecrets: OpenAiSecretsService,
    private readonly _logger: Logger,
  ) {}

  /**
   * Creates a chain that may be invoked later.
   * @param modelName
   */
  async createChain(modelName?: string) {
    const model = await this._createModel(modelName);
    const promptTemplate = await this._createPrompt();
    const chain = promptTemplate.pipe(model);
    return chain;
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
}
