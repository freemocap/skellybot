import { SlackModule } from 'nestjs-slack';
import { getSlackToken } from '../../appSecrets/getSlackToken';

export const createSlackModule = () => {
  return SlackModule.forRootAsync({
    useFactory: async () => {
      return {
        token: await getSlackToken(),
        type: 'api',
        defaultChannel: 'bot-playground',
      };
    },
  });
};