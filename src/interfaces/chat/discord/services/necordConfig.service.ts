import { Injectable } from '@nestjs/common';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';
import { SecretsManagerService } from '../../../../shared/gcp/secretsManager.service';
import { DISCORD_BOT_TOKEN } from '../secrets/secrets';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NecordConfigService {
  constructor(
    private readonly sms: SecretsManagerService,
    private readonly _cfgService: ConfigService,
  ) {}

  async createNecordOptions(): Promise<NecordModuleOptions> {
    const token = await this._createTokenByNodeEnv();
    return {
      token,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
      ],
    };
  }

  private async _createTokenByNodeEnv() {
    if (process.env.NODE_ENV === 'production') {
      const secretName = this._cfgService.get(DISCORD_BOT_TOKEN);
      const [secret] = await this.sms.getManager().accessSecretVersion({
        name: secretName,
      });
      return secret.payload.data.toString();
    }

    return this._cfgService.get('DISCORD_BOT_TOKEN');
  }
}
