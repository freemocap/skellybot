import {
  AnyThreadChannel,
  ChannelType,
  Client,
  Guild,
  TextChannel,
} from 'discord.js';
import { saveJSONData } from './jsonFileService';

export const scrapeServer = async (
  client: Client,
  serverId: string,
  outputDirectory: string,
): Promise<void> => {
  const server = await client.guilds.fetch(serverId);
  if (!server) {
    throw new Error('Could not find the target server');
  }

  console.log(`Scraping server: ${server.name}...`);

  const serverData = {
    serverName: server.name,
    categories: [],
    topLevelChannels: [],
  };
  const { categoryChannels, textChannels } = await getChannels(server);

  for (const categoryChannel of categoryChannels.values()) {
    serverData.categories.push({ name: categoryChannel.name, channels: [] });
  }

  for (const textChannel of textChannels.values()) {
    const channelData = await processTextChannel(textChannel as TextChannel);
    if (!textChannel.parent) {
      console.log(`||Processing channel: ${textChannel.name}`);
      serverData.topLevelChannels.push({
        name: textChannel.name,
        data: channelData,
      });
    } else {
      const category = serverData.categories.find(
        (category) => category.name === textChannel.parent.name,
      );
      if (category) {
        category.channels.push({
          name: textChannel.name,
          data: channelData,
        });
      }
    }
  }

  await saveJSONData(serverData, outputDirectory);
  console.log('Finished scraping server!');
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
  for (const thread of threads.threads.values()) {
    console.log(`||----Processing thread: ${thread.name}`);
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
    console.log('||------No messages to process');
    return null;
  }
  console.log(
    `||------Processing ${messages.size} messages from thread:  ${thread.name}`,
  );
  const threadData = {
    name: thread.name,
    messages: messages.map((message) => ({
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
