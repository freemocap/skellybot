import {Injectable} from '@nestjs/common';
import {NecordModuleOptions} from 'necord';
import {IntentsBitField} from 'discord.js';
import {SecretsManagerService} from "../gcp/secretsManager.service";

@Injectable()
export class NecordConfigService {
  constructor(private readonly sms: SecretsManagerService) {
  }

  async createNecordOptions(): Promise<NecordModuleOptions> {
    const [secret] = await this.sms.getManager().accessSecretVersion({
      name: "projects/588063171007/secrets/DISCORD_API_TOKEN/versions/latest",
    })
    const token = secret.payload.data.toString();
    return {
      token,
      intents: [IntentsBitField.Flags.Guilds],
    }
  }
}