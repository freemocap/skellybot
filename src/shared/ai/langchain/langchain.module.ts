import { Logger, Module } from '@nestjs/common';
import { ChainBuilderService } from './chain-builder/chain-builder.service';
import { GcpModule } from '../../gcp/gcp.module';
import { OpenAiSecretsService } from './openAiSecrets.service';

@Module({
  imports: [GcpModule],
  providers: [ChainBuilderService, OpenAiSecretsService, Logger],
  exports: [ChainBuilderService],
})
export class LangchainModule {}
