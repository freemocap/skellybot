import { Logger, Module } from '@nestjs/common';

import { GcpModule } from '../../gcp/gcp.module';
import { LangchainService } from './langchain.service';
import { OpenaiModule } from '../openai/openai.module';

@Module({
  imports: [GcpModule, OpenaiModule],
  providers: [LangchainService, Logger],
  exports: [LangchainService],
})
export class LangchainModule {}
