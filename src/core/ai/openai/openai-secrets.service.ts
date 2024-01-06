import { GcpSecretsService } from '../../gcp/gcp-secrets.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenaiSecretsService {
  constructor(private readonly _sms: GcpSecretsService) {}
  async getOpenAIKey() {
    const [secret] = await this._sms.getSecretsManager().accessSecretVersion({
      name: 'projects/588063171007/secrets/OPENAI_API_KEY/versions/latest',
    });
    return secret.payload.data.toString();
  }
}
