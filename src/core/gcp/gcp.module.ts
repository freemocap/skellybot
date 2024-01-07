import { Module } from '@nestjs/common';
import { GcpSecretsService } from './gcp-secrets.service';

@Module({
  providers: [GcpSecretsService],
  exports: [GcpSecretsService],
})
export class GcpModule {}
