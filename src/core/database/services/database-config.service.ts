import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GcpSecretsService } from '../../gcp/gcp-secrets.service';
import { MongooseModuleOptions } from '@nestjs/mongoose';

@Injectable()
export class DatabaseConfigService {
  private _tokenMap = {
    MONGODB_URI: 'projects/588063171007/secrets/MONGODB_URI/versions/latest',
  };
  constructor(
    private readonly sms: GcpSecretsService,
    private readonly _cfgService: ConfigService,
  ) {}

  async createMongooseOptions(): Promise<MongooseModuleOptions> {
    const uri = await this._getUriByNodeEnv();
    return { uri };
  }

  private async _getUriByNodeEnv() {
    if (process.env.NODE_ENV === 'production' || true) {
      const secretName = this._tokenMap.MONGODB_URI;
      const [secret] = await this.sms.getSecretsManager().accessSecretVersion({
        name: secretName,
      });
      return secret.payload.data.toString();
    }

    return this._cfgService.getOrThrow('MONGODB_URI');
  }
}
