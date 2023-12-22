import { Controller, Get } from '@nestjs/common';

import { LlmModelService } from './llm-model.controller';

@Controller('llm-model')
export class LlmModelController {
  constructor(private llmModelService: LlmModelService) {}

  @Get('create')
  async createModel() {
    return this.llmModelService.createModel();
  }
}
