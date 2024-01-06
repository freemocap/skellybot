import { Injectable } from '@nestjs/common';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { GcpSecretsService } from '../../../core/gcp/gcp-secrets.service';

@Injectable()
export class DiscordConfigService {
  private _tokenMap = {
    DISCORD_BOT_TOKEN:
      'projects/588063171007/secrets/DISCORD_BOT_TOKEN/versions/latest',
  };
  constructor(
    private readonly sms: GcpSecretsService,
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
      const secretName = this._tokenMap.DISCORD_BOT_TOKEN;
      const [secret] = await this.sms.getSecretsManager().accessSecretVersion({
        name: secretName,
      });
      return secret.payload.data.toString();
    }

    return this._cfgService.getOrThrow('DISCORD_BOT_TOKEN');
  }
}
