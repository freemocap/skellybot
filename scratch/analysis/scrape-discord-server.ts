import { config } from 'dotenv';
import {
  Client,
  Collection,
  GatewayIntentBits,
  GuildBasedChannel,
} from 'discord.js';

console.log(`Starting the bot, running from ${__dirname}`);
const envPath = '../../.env.discord';
console.log(`Loading environment variables from ${envPath}`);
config({ path: envPath });
const discordToken = process.env.DISCORD_BOT_TOKEN;
const targetServerId = process.env.TARGET_SERVER_ID;

if (!discordToken) {
  throw new Error('DISCORD_TOKEN is not set');
}

if (!targetServerId) {
  throw new Error('TARGET_SERVER_ID is not set');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log('This bot is part of the following guilds:');

  await client.guilds.cache.forEach(async (guild) => {
    console.log(guild.name);
  });

  const server = client.guilds.cache.get(targetServerId);
  if (!server) {
    throw new Error('Could not find the target server');
  }
  console.log(`Scraping server: ${server.name}`);

  const channels: Collection<string, GuildBasedChannel> =
    await server.channels.fetch();
  console.log(`Server has ${channels.size} channels`);

  const categories = channels.filter((c) => c.type === 4);
  console.log(`Server has ${categories.size} categories`);

  // Initialize the data structure
  const serverData: Record<string, any> = {};

  // Loop through categories
  for (const [categoryId, category] of categories) {
    const categoryName = category.name;
    console.log(`Processing category: ${categoryName}`);
    serverData[categoryName] = {};

    // Fetch channels within the category
    const channelsInCategory = channels.filter(
      (c) => c.parentId === categoryId,
    );
    for (const [channelId, channel] of channelsInCategory) {
      if (channel.type === 0) {
        // TextChannel
        const channelName = channel.name;
        serverData[categoryName][channelName] = {};
        serverData[categoryName][channelName]['channelId'] = channelId;

        // Fetch threads within the channel
        // @ts-ignore
        const threads = await channel.threads.fetchActive();
        for (const [threadId, thread] of threads.threads) {
          const threadName = thread.name;
          serverData[categoryName][channelName][threadName] = [];
          serverData[categoryName][channelName][threadName]['threadId'] =
            threadId;

          // Fetch messages within the thread
          const messages = await thread.messages.fetch();
          for (const [messageId, message] of messages) {
            // Add message content to the list
            serverData[categoryName][channelName][threadName].push({
              messageId,
              content: message.content,
              speaker: message.author.username,
              object: message,
            });
          }
        }
      }
    }
  }
  console.log('Saving server data to files...');
  await saveData(serverData);
  console.log('Done!');
  await client.destroy();
});

const saveData = async (data: any, saveDirectory: string = '.') => {
  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
  }
  console.log(`Saving data to files in ${saveDirectory}`);

  const jsonContent = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(`${saveDirectory}/server-data.json`, jsonContent);

  console.log(`Data saved to:  ${saveDirectory}`);
};

client.login(process.env.DISCORD_BOT_TOKEN);
