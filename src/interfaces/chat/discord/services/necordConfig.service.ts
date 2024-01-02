import { Injectable } from '@nestjs/common';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';
import { SecretsManagerService } from '../../../../shared/gcp/secretsManager.service';
import { DISCORD_API_DEV_TOKEN, DISCORD_API_TOKEN } from '../secrets/secrets';

@Injectable()
export class NecordConfigService {
  constructor(private readonly sms: SecretsManagerService) {}

  async createNecordOptions(): Promise<NecordModuleOptions> {
    const secretName = this._createTokenByNodeEnv();

    const [secret] = await this.sms.getManager().accessSecretVersion({
      name: secretName,
    });
    const token = secret.payload.data.toString();
    return {
      token,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
      ],
    };
  }

  private _createTokenByNodeEnv() {
    if (process.env.NODE_ENV === 'production') {
      return DISCORD_API_TOKEN;
    }

    return DISCORD_API_DEV_TOKEN;
  }
}
