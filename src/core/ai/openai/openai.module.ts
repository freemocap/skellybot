import { Module } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { GcpModule } from '../../gcp/gcp.module';
import { OpenaiChatService } from './openai-chat.service';

@Module({
  imports: [GcpModule],
  providers: [OpenaiSecretsService, OpenaiChatService],
  exports: [OpenaiSecretsService, OpenaiChatService],
})
export class OpenaiModule {}
