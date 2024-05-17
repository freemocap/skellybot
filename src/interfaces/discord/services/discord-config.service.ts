import { Injectable, Logger } from '@nestjs/common';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { GcpSecretsService } from '../../../core/gcp/gcp-secrets.service';

@Injectable()
export class DiscordConfigService {
  private readonly _logger = new Logger(DiscordConfigService.name);
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
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.DirectMessages, // TODO - This doesn't work, why? Figure out how to make botto respond to DMs
        IntentsBitField.Flags.DirectMessageReactions,
        IntentsBitField.Flags.DirectMessageTyping,
      ],
    };
  }

  private async _createTokenByNodeEnv() {
    if (process.env.NODE_ENV === 'production') {
      this._logger.log('Production environment detected - using GCP secrets');
      const secretName = this._tokenMap.DISCORD_BOT_TOKEN;
      const [secret] = await this.sms.getSecretsManager().accessSecretVersion({
        name: secretName,
      });
      return secret.payload.data.toString();
    }
    this._logger.log(
      'Development environment detected - using local .env files',
    );
    return this._cfgService.getOrThrow('DISCORD_BOT_TOKEN');
  }

  public getDevServers() {
    const devServers = this._cfgService.get<string>('DEV_SERVERS').split(',');
    return devServers ? devServers : [];
  }
}
