import { Logger, Module } from '@nestjs/common';
import { LlmModelController } from './llm-model/llm-model.service';
import { LlmModelService } from './llm-model/llm-model.controller';
import { GcpModule } from '../../../gcp/gcp.module';
import { OpenAiSecretsService } from './openAiSecrets.service';

@Module({
  imports: [GcpModule],
  controllers: [LlmModelController],
  providers: [LlmModelService, OpenAiSecretsService, Logger],
  exports: [LlmModelService],
})
export class LangchainModule {}
