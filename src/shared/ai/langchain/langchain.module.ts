import { Logger, Module } from '@nestjs/common';

import { GcpModule } from '../../gcp/gcp.module';
import { LangchainService } from './langchain.service';
import { OpenaiModule } from '../openai/openai.module';
import { DatabaseModule } from '../../database/database.module';
import { LangchainChainService } from './langchain-chain.service';

@Module({
  imports: [GcpModule, OpenaiModule, DatabaseModule],
  providers: [LangchainService, LangchainChainService, Logger],
  exports: [LangchainService, LangchainChainService],
})
export class LangchainModule {}
