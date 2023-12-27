import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAiSecretsService } from '../openAiSecrets.service';
import { ChatPromptTemplate } from 'langchain/prompts';

@Injectable()
export class ChainBuilderService {
  private _model: OpenAI<any>;
  private promptTemplate: ChatPromptTemplate<any, any>;

  constructor(
    private readonly _openAiSecrets: OpenAiSecretsService,
    private readonly _logger: Logger,
  ) {}

  async createPrompt() {
    if (!this.promptTemplate) {
      this._logger.log('Creating prompt...');
      this.promptTemplate = ChatPromptTemplate.fromMessages([
        [
          'system',
          'You were having a conversation with a human about {topic}\n Always say something about penguins in every response.',
        ],
        ['human', '{text}'],
      ]);
    }
    this._logger.log('Returning prompt: ' + this.promptTemplate);
    return this.promptTemplate;
  }

  async createModel(modelName?: string) {
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

  async createChain(modelName?: string) {
    const model = await this.createModel(modelName);
    const promptTemplate = await this.createPrompt();
    const chain = promptTemplate.pipe(model);
    this._logger.log('Created chain: ' + chain);
    return chain;
  }
}
