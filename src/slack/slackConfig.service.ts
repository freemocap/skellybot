import {Injectable} from '@nestjs/common';
import {SecretsManagerService} from "../gcp/secretsManager.service";
import {SlackConfig} from "nestjs-slack/dist/types";

@Injectable()
export class SlackConfigService {
  constructor(private readonly sms: SecretsManagerService) {}

  async slackConfigModuleOptions(): Promise<SlackConfig> {
    const [secret] = await this.sms.getManager().accessSecretVersion({
      name: "projects/588063171007/secrets/SLACK_BOT_TOKEN/versions/latest",
    })
    const token = secret.payload.data.toString();
    return {
      type: 'api',
      token: token,
    }
  }
}