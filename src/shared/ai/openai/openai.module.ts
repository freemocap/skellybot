import { Module } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { GcpModule } from '../../gcp/gcp.module';

@Module({
  imports: [GcpModule],
  providers: [OpenaiSecretsService],
  exports: [OpenaiSecretsService],
})
export class OpenaiModule {}
