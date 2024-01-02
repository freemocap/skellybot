import { App } from '@slack/bolt';
import { SlackConfigService } from '../config/slackConfig.service';

export const slackServiceFactory = {
  provide: App,
  inject: [SlackConfigService],
  useFactory: async (scs: SlackConfigService) => {
    const opts = await scs.createSlackOptions();
    return new App(opts);
  },
};
