import { GcpSecretsService } from '../../gcp/gcp-secrets.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenaiSecretsService {
  private _tokenMap = {
    OPENAI_API_KEY:
      'projects/588063171007/secrets/OPENAI_API_KEY/versions/latest',
  };

  constructor(
    private readonly _sms: GcpSecretsService,
    private readonly _cfgService: ConfigService,
  ) {}

  async getOpenAIKey() {
    if (process.env.NODE_ENV === 'production') {
      const secretName = this._tokenMap.OPENAI_API_KEY;
      const [secret] = await this._sms.getSecretsManager().accessSecretVersion({
        name: secretName,
      });
      return secret.payload.data.toString();
    }

    return this._cfgService.getOrThrow('OPENAI_API_KEY');
  }
}
