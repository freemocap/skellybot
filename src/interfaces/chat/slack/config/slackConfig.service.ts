import { Injectable } from '@nestjs/common';
import { SecretsManagerService } from '../../../../shared/gcp/secretsManager.service';
import { ConfigService } from '@nestjs/config';
import { AppOptions } from '@slack/bolt/dist/App';

@Injectable()
export class SlackConfigService {
  private _tokenMap = {
    SLACK_BOT_TOKEN:
      'projects/588063171007/secrets/SLACK_BOT_TOKEN/versions/latest',
    SLACK_APP_TOKEN:
      'projects/588063171007/secrets/SLACK_APP_TOKEN/versions/latest',
    SLACK_SIGNING_SECRET:
      'projects/588063171007/secrets/SLACK_SIGNING_SECRET/versions/latest',
  };
  constructor(
    private readonly _sms: SecretsManagerService,
    private readonly _cfgService: ConfigService,
  ) {}

  async createSlackOptions(): Promise<AppOptions> {
    return {
      token: await this._createTokenByNodeEnv('SLACK_BOT_TOKEN'),
      appToken: await this._createTokenByNodeEnv('SLACK_APP_TOKEN'),
      signingSecret: await this._createTokenByNodeEnv('SLACK_SIGNING_SECRET'),
      socketMode: true,
      // socketMode: Boolean(await this._cfgService.get('SLACK_SOCKET_MODE')),
    };
  }

  private async _createTokenByNodeEnv(tokenString: string) {
    if (process.env.NODE_ENV === 'production') {
      const secretName = this._tokenMap[tokenString];
      const [secret] = await this._sms.getManager().accessSecretVersion({
        name: secretName,
      });
      return secret.payload.data.toString();
    }

    return this._cfgService.get(tokenString);
  }
}
