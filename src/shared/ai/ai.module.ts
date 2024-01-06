import { OpenaiModule } from './openai/openai.module';
import { LangchainModule } from './langchain/langchain.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [OpenaiModule, LangchainModule],
  providers: [],
  exports: [],
})
export class AiModule {}
