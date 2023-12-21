import { Module } from '@nestjs/common';
import { LlmModelController } from './llm-model/llm-model.service';
import { LlmModelService } from './llm-model/llm-model.controller';
import { GcpModule } from '../../../gcp/gcp.module';

@Module({
  imports: [GcpModule],
  controllers: [LlmModelController],
  providers: [LlmModelService],
  exports: [LlmModelService],
})
export class LangchainModule {}
