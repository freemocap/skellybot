import { Injectable } from '@nestjs/common';
import { SecretsManagerService } from '../gcp/secretsManager.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MongoConfigService {
  private _tokenMap = {
    MONGO_URI: 'projects/588063171007/secrets/MONGO_URI/versions/latest',
  };
  constructor(
    private readonly _sms: SecretsManagerService,
    private readonly _cfgService: ConfigService,
  ) {}

  private async _createTokenByNodeEnv() {
    if (process.env.NODE_ENV === 'production') {
      const secretName = this._tokenMap.MONGO_URI;
      const [secret] = await this._sms
        .getManager()
        .accessSecretVersion({ name: secretName });
      return secret.payload.data.toString();
    }
    return this._cfgService.get('DISCORD_BOT_TOKEN');
  }

  public async createMongooseOptions() {
    return {
      uri: await this._createTokenByNodeEnv(),
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
      autoIndex: false,
      retryWrites: true,
    };
  }
}
