import { Injectable } from '@nestjs/common';
import { SecretsManagerService } from '../gcp/secretsManager.service';

@Injectable()
export class MongoSecretsService {
  constructor(private readonly _sms: SecretsManagerService) {}
  async getMongoUri() {
    const [secret] = await this._sms.getManager().accessSecretVersion({
      name: 'projects/588063171007/secrets/OPENAI_API_KEY/versions/latest',
    });
    return secret.payload.data.toString();
  }
}
