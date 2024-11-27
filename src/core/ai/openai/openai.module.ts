import { Logger, Module } from '@nestjs/common';
import { OpenaiSecretsService } from './openai-secrets.service';
import { GcpModule } from '../../gcp/gcp.module';
import { OpenaiChatService } from './openai-chat.service';
import { OpenaiAudioService } from './openai-audio.service';
import { OpenaiImageService } from './openai-image.service';

@Module({
  imports: [GcpModule],
  providers: [
    OpenaiSecretsService,
    OpenaiChatService,
    OpenaiAudioService,
    OpenaiImageService,
    Logger,
  ],
  exports: [
    OpenaiSecretsService,
    OpenaiChatService,
    OpenaiAudioService,
    OpenaiImageService,
  ],
})
export class OpenaiModule {}
