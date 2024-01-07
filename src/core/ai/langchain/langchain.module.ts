import { Logger, Module } from '@nestjs/common';

import { GcpModule } from '../../gcp/gcp.module';
import { LangchainService } from './langchain.service';
import { OpenaiModule } from '../openai/openai.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [GcpModule, OpenaiModule, DatabaseModule],
  providers: [LangchainService, Logger],
  exports: [LangchainService],
})
export class LangchainModule {}
