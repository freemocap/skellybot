import { config } from 'dotenv';
import {
  Client,
  Collection,
  GatewayIntentBits,
  GuildBasedChannel,
} from 'discord.js';
import * as fs from 'fs';

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

const saveDataToMarkdown = async (data: any, saveDirectory: string = '.') => {
  console.log('Starting Markdown formatting...');

  for (const category in data) {
    const categoryPath = `${saveDirectory}/${sanitizeFilename(category)}`;
    createDirectory(categoryPath);

    for (const channel in data[category]) {
      const channelPath = `${categoryPath}/${sanitizeFilename(channel)}`;
      createDirectory(channelPath);

      for (const messageData of data[category][channel]) {
        if (messageData.messageId) {
          // Ensure it's a message object
          const messagePath = `${channelPath}/${sanitizeFilename(
            messageData.messageId,
          )}.md`;
          const markdownContent = formatMessageToMarkdown(messageData);

          await fs.promises.writeFile(messagePath, markdownContent, 'utf8');
          console.log(
            `Saved message ${messageData.messageId} to ${messagePath}`,
          );
        }
      }
    }
  }

  console.log('Markdown formatting completed.');
};

const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

const createDirectory = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
    console.log(`Created directory: ${path}`);
  }
};

const formatMessageToMarkdown = (messageData: any) => {
  let markdownContent = `**${messageData.speaker}:** ${messageData.content}\n\n`;

  // Handle attachments
  messageData.attachments.forEach(async (attachmentUrl: string) => {
    const attachmentName = getFileNameFromUrl(attachmentUrl);
    const localPath = `./attachments/${sanitizeFilename(attachmentName)}`;
    markdownContent += `![${attachmentName}](${localPath})\n`;
  });

  return markdownContent;
};

const getFileNameFromUrl = (url: string) => {
  return url.split('/').pop();
};

// Dummy data for demonstration purposes
const dummyServerData = {
  General: {
    welcome: [
      {
        messageId: '123456',
        content: 'Hello, world!',
        speaker: 'User1',
        attachments: ['http://example.com/image.png'],
      },
    ],
  },
};

// Call the function with dummy data to test
saveDataToMarkdown(dummyServerData, './output');

client.login(process.env.DISCORD_BOT_TOKEN);
