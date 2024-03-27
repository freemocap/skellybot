import { Client, GatewayIntentBits } from 'discord.js';
import { scrapeServer } from './scrapeService';

export const startBot = async (
  token: string,
  serverId: string,
  outputDirectory: string,
): Promise<void> => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });

  client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await scrapeServer(client, serverId, outputDirectory);
    await client.destroy();
  });

  await client.login(token);
};
