import { App } from '@slack/bolt';
import { SlackConfigService } from '../config/slackConfig.service';
import { SlackLoggerAdapter } from '../logging/slack-logger-proxy.service';
import { Provider } from '@nestjs/common';

export const slackServiceFactory: Provider = {
  provide: App,
  inject: [SlackConfigService, SlackLoggerAdapter],
  useFactory: async (scs: SlackConfigService, logger: SlackLoggerAdapter) => {
    const opts = await scs.createSlackOptions();
    return new App({
      ...opts,
      logger,
    });
  },
};
