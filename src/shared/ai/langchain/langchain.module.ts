import { Logger, Module } from '@nestjs/common';
import { LangchainService } from './chain-builder/langchain.service';
import { GcpModule } from '../../gcp/gcp.module';
import { OpenAiSecretsService } from './openAiSecrets.service';

@Module({
  imports: [GcpModule],
  providers: [LangchainService, OpenAiSecretsService, Logger],
  exports: [LangchainService],
})
export class LangchainModule {}
