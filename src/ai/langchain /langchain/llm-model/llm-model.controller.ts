import { Injectable } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { SecretsManagerService } from '../../../../gcp/secretsManager.service';

@Injectable()
export class LlmModelService {
  private _model: OpenAI<any>;

  constructor(private readonly _secretsManager: SecretsManagerService) {}

  async createModel() {
    if (!this._model) {
      this._model = new OpenAI({
        modelName: 'gpt-3.5-turbo',
        openAIApiKey: await this._secretsManager.getOpenAIKey(),
      });
    }
    return this._model;
  }
}
