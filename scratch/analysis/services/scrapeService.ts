import { AnyThreadChannel, Client, Guild, TextChannel } from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { saveJSONData } from './fileService';

export const scrapeServer = async (
  client: Client,
  serverId: string,
  outputDirectory: string,
): Promise<void> => {
  const server = await client.guilds.fetch(serverId);
  if (!server) {
    throw new Error('Could not find the target server');
  }
  console.log(`Scraping server: ${server.name}`);

  const serverData = {};
  serverData['serverName'] = server.name;
  serverData['categories'] = [];
  const { categoryChannels, textChannels } = await getChannels(server);

  serverData['categories']['top-level-channels'] = [];
  for (const categoryChannel of categoryChannels.values()) {
    serverData['categories'].push({ name: categoryChannel.name, data: {} });
  }

  for (const textChannel of textChannels.values()) {
    const channelData = await processChannel(textChannel as TextChannel);
    if (!textChannel.parent) {
      console.log(`||Processing channel: ${textChannel.name}`);
      serverData['categories']['top-level-channels'].push({
        name: textChannel.name,
        data: channelData,
      });
    } else {
      serverData['categories'][textChannel.parent.name].push({
        name: textChannel.name,
        data: channelData,
      });
    }
  }

  await saveJSONData(serverData, outputDirectory);
  console.log('Finished scraping server!');
};

async function getChannels(server: Guild) {
  const allChannels = await server.channels.fetch();
  const categoryChannels = allChannels.filter(
    // @ts-ignore
    (channel) => channel.type === 'GUILD_CATEGORY',
  );
  const textChannels = allChannels.filter(
    // @ts-ignore
    (channel) => channel.type === 'GUILD_TEXT',
  );
  return { categoryChannels, textChannels };
}

const processChannel = async (channel: TextChannel) => {
  const channelData = {};
  channelData['name'] = channel.name;
  channelData['threads'] = [];
  const threads = await channel.threads.fetch();
  for (const thread of threads.threads.values()) {
    console.log(`||----Processing thread: ${thread.name}`);
    const threadData = await processThread(thread);
    if (threadData) {
      channelData['threads'].push(threadData);
    }
  }
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
  const threadData = {};
  threadData['name'] = thread.name;
  threadData['messages'] = [];
  for (const message of messages.values()) {
    const attachments = message.attachments.map((attachment) => {
      return {
        name: attachment.name,
        url: attachment.url,
      };
    });

    const messageData = {
      speakerName: message.author.username,
      speakerId: message.author.id,
      content: message.content,
      timestamp: message.createdTimestamp,
      jumpUrl: message.url,
      attachments,
    };
    threadData['messages'].push(messageData);
  }
  return threadData;
};
