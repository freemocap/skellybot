import { SecretsManagerService } from '../../../gcp/secretsManager.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenAiSecretsService {
  constructor(private readonly _sms: SecretsManagerService) {}
  async getOpenAIKey() {
    const [secret] = await this._sms.getManager().accessSecretVersion({
      name: 'projects/588063171007/secrets/OPENAI_API_KEY/versions/latest',
    });
    return secret.payload.data.toString();
  }
}
