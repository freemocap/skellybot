import { App } from '@slack/bolt';
import { SlackConfigService } from '../config/slackConfig.service';
import { SlackLoggerProxy } from '../logging/slack-logger-proxy.service';

export const slackServiceFactory = {
  provide: App,
  inject: [SlackConfigService, SlackLoggerProxy],
  useFactory: async (scs: SlackConfigService, logger: SlackLoggerProxy) => {
    const opts = await scs.createSlackOptions();
    return new App({
      ...opts,
      logger,
      // logLevel: LogLevel.DEBUG,
    });
  },
};
