import { ConfigService } from '@nestjs/config';
import { App } from '@slack/bolt';
import { AppOptions } from '@slack/bolt/dist/App';

export const slackServiceFactory = {
  provide: App,
  inject: [ConfigService],
  useFactory: (configService: ConfigService, options: AppOptions) => {
    const opts: AppOptions = {
      token: configService.get('SLACK_BOT_TOKEN'),
      signingSecret: configService.get('SLACK_SIGNING_SECRET'),
      socketMode: Boolean(configService.get<boolean>('SLACK_SOCKET_MODE')),
      appToken: configService.get('SLACK_APP_TOKEN'),
      ...options,
    };
    return new App(opts);
  },
};
