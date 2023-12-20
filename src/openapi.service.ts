import { SecretsManagerService } from './gcp/secretsManager.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenAIConfigService {
  constructor(private readonly sms: SecretsManagerService) {}

  async getOpenAIKey() {
    const [secret] = await this.sms.getManager().accessSecretVersion({
      name: 'projects/588063171007/secrets/OPENAPI_KEY/versions/latest',
    });
    return secret.payload.data.toString();
  }
}
