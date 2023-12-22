import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAiSecretsService } from '../openAiSecrets.service';

@Injectable()
export class LlmModelService {
  private _model: OpenAI<any>;

  constructor(
    private readonly _openAiSecrets: OpenAiSecretsService,
    private readonly _logger: Logger,
  ) {}

  async createModel() {
    if (!this._model) {
      this._logger.log('Creating model...');
      this._model = new OpenAI({
        modelName: 'gpt-3.5-turbo',
        openAIApiKey: await this._openAiSecrets.getOpenAIKey(),
      });
    }
    this._logger.log('Returning model: ' + this._model.modelName);
    return this._model;
  }
}
