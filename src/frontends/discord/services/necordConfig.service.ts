import { Injectable } from '@nestjs/common';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';
import { SecretsManagerService } from '../../../gcp/secretsManager.service';

const DISCORD_API_TOKEN =
  'projects/588063171007/secrets/DISCORD_API_TOKEN/versions/latest';

const DISCORD_API_DEV_TOKEN =
  'projects/588063171007/secrets/DISCORD_API_DEV_TOKEN/versions/latest';

@Injectable()
export class NecordConfigService {
  constructor(private readonly sms: SecretsManagerService) {}

  async createNecordOptions(): Promise<NecordModuleOptions> {
    const secretName =
      process.env.NODE_ENV === 'production'
        ? DISCORD_API_TOKEN
        : DISCORD_API_DEV_TOKEN;

    const [secret] = await this.sms.getManager().accessSecretVersion({
      name: secretName,
    });
    const token = secret.payload.data.toString();
    return {
      token,
      intents: [IntentsBitField.Flags.Guilds],
    };
  }
}
