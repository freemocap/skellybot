import { Injectable } from '@nestjs/common';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

@Injectable()
export class SecretsManagerService {
  getManager() {
    return new SecretManagerServiceClient();
  }
  async getOpenAIKey() {
    const [secret] = await this.getManager().accessSecretVersion({
      name: 'projects/588063171007/secrets/OPENAI_API_KEY/versions/latest',
    });
    return secret.payload.data.toString();
  }
}
