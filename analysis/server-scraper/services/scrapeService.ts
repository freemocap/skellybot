import {
  AnyThreadChannel,
  ChannelType,
  Client,
  Guild,
  TextChannel,
} from 'discord.js';
import { saveJSONData } from './jsonFileService';
import { convertJsonToMarkdown } from './json-to-md-directory';

export const scrapeServer = async (
  client: Client,
  serverId: string,
  outputDirectory: string,
): Promise<void> => {
  const server = await client.guilds.fetch(serverId);
  if (!server) {
    throw new Error('Could not find the target server');
  }

  console.log(`🏰 Scraping server: ${server.name}...`);

  const serverData = {
    serverName: server.name,
    categories: [],
    topLevelChannels: [],
  };
  const { categoryChannels, textChannels } = await getChannels(server);

  console.log(`🗂️ Categories:`);
  for (const categoryChannel of categoryChannels.values()) {
    if (categoryChannel.name.startsWith('#')) {
      serverData.categories.push({ name: categoryChannel.name, channels: [] });
      console.log(`  ├─🗂️ ${categoryChannel.name}`);
    }
  }

  console.log(`💬 Channels:`);
  for (const textChannel of textChannels.values()) {
    const channelData = await processTextChannel(textChannel as TextChannel);
    if (!textChannel.parent) {
      console.log(`  ├─💬 ${textChannel.name} (No category)`);
    } else {
      const category = serverData.categories.find(
        (category) => category.name === textChannel.parent.name,
      );
      if (category) {
        category.channels.push({
          name: textChannel.name,
          data: channelData,
        });
        console.log(`  ├─💬 ${textChannel.name}`);
      }
    }
  }

  // print number of categories, channels, and threads
  console.log(`🧵 Threads:`);
  let totalChannels = 0;
  let totalThreads = 0;
  let totalMessages = 0;
  for (const category of serverData.categories) {
    totalChannels += category.channels.length;
    for (const channel of category.channels) {
      if (channel.data.threads.length > 0) {
        totalThreads += channel.data.threads.length;
        for (const thread of channel.data.threads) {
          totalMessages += thread.messages.length;
          console.log(`  ├─🧵 ${thread.name}`);
        }
      }
    }
  }

  console.log(`Total categories: ${serverData.categories.length}`);
  console.log(`Total channels: ${totalChannels}`);
  console.log(`Total threads: ${totalThreads}`);
  console.log(`Total messages: ${totalMessages}`);
  const saveDirectory = `${outputDirectory}/discord-server-data/${server.name.replace(
    / /g,
    '-',
  )}`;
  const jsonSavePath = await saveJSONData(serverData, saveDirectory);
  console.log('🏰 Finished scraping server!');
  convertJsonToMarkdown(jsonSavePath);
  console.log('Saved to markdown files');
};

async function getChannels(server: Guild) {
  const allChannels = await server.channels.fetch();
  const categoryChannels = allChannels.filter(
    (channel) => channel.type === ChannelType.GuildCategory,
  );
  const textChannels = allChannels.filter(
    (channel) => channel.type === ChannelType.GuildText,
  );
  return { categoryChannels, textChannels };
}
const processTextChannel = async (channel: TextChannel) => {
  const channelData = {
    name: channel.name,
    threads: [],
  };
  const threads = await channel.threads.fetch();
  console.log(`  ├─💬 Channel: ${channel.name}`);
  console.log(`  │  🧵 Threads:`);
  for (const thread of threads.threads.values()) {
    console.log(`  │  ├─🧵 Processing thread: ${thread.name}`);
    const threadData = await processThread(thread);
    if (threadData) {
      channelData.threads.push(threadData);
    }
  }
  return channelData;
};

const processThread = async (thread: AnyThreadChannel) => {
  const messages = await thread.messages.fetch();
  if (messages.size === 0) {
    console.log('  │  │  └─🧵 No messages to process');
    return null;
  }
  console.log(
    `  │  │  ├─🧵 Processing ${messages.size} messages from thread: ${thread.name}`,
  );
  const orderedMessages = [...messages.values()].reverse();
  const threadData = {
    name: thread.name,
    messages: orderedMessages.map((message) => ({
      speakerName: message.author.username,
      speakerId: message.author.id,
      content: message.content,
      timestamp: message.createdTimestamp,
      jumpUrl: message.url,
      attachments: message.attachments.map((attachment) => ({
        name: attachment.name,
        url: attachment.url,
      })),
    })),
  };
  return threadData;
};
