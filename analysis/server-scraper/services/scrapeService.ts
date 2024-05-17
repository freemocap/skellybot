import {
  AnyThreadChannel,
  ChannelType,
  Client,
  Collection,
  Guild,
  TextChannel,
} from 'discord.js';
import { saveJSONData } from './jsonFileService';
import { convertJsonToMarkdown } from './json-to-md-directory';
import * as path from 'path';
import { Couplet, MessageRecord, Server, Thread } from './data-types';

async function getServerAndCategories(client: Client, serverId: string) {
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
  return { serverData, textChannels };
}

async function loopThroughChannels(
  textChannels: Collection<any, any>,
  serverData: Server,
) {
  for (const textChannel of textChannels.values()) {
    if (textChannel.parent) {
      const category = serverData.categories.find(
        (category) => category.name === textChannel.parent.name,
      );
      if (category) {
        //log the category and channel
        console.log(`  ├─🗂️ ${category.name}`);
        console.log(`  │  ├─💬 ${textChannel.name}`);
        const channelData = await processTextChannel(
          textChannel as TextChannel,
        );
        if (channelData.threads.length > 0) {
          category.channels.push({
            name: textChannel.name,
            data: channelData,
          });
        }
      }
    }
  }
}

async function saveToDisk(
  serverName: string,
  outputDirectory: string,
  serverData: Server,
) {
  const serverDirectoryName = serverName.replace(/ /g, '-');
  const saveDirectory = path.join(
    outputDirectory,
    'discord-server-data',
    serverDirectoryName,
  );

  return await saveJSONData(serverData, saveDirectory);
}

function printStats(serverData: {
  serverName: string;
  categories: any[];
  topLevelChannels: any[];
}) {
  // print number of categories, channels, and threads
  let totalChannels = 0;
  let totalThreads = 0;
  let totalCouplets = 0;
  for (const category of serverData.categories) {
    totalChannels += category.channels.length;
    for (const channel of category.channels) {
      if (channel.data.threads.length > 0) {
        totalThreads += channel.data.threads.length;
        for (const thread of channel.data.threads) {
          totalCouplets += thread.couplets.length;
        }
      }
    }
  }
  console.log(`Total categories: ${serverData.categories.length}`);
  console.log(`Total channels: ${totalChannels}`);
  console.log(`Total threads: ${totalThreads}`);
  console.log(`Total Human/AI couplets: ${totalCouplets}`);

  console.log('Saved to markdown files');
}

export const scrapeServer = async (
  client: Client,
  serverId: string,
  outputDirectory: string,
): Promise<void> => {
  const { serverData, textChannels } = await getServerAndCategories(
    client,
    serverId,
  );

  console.log(`💬 Channels:`);
  await loopThroughChannels(textChannels, serverData);
  const jsonSavePath = await saveToDisk(
    serverData.serverName,
    outputDirectory,
    serverData,
  );
  console.log('🏰 Finished scraping server!');
  convertJsonToMarkdown(jsonSavePath);

  printStats(serverData);
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
  const fetchedThreads = await channel.threads.fetch();
  if (fetchedThreads.threads.size === 0) {
    console.log('  │  └─🧵 ❌ No threads to process');
  }
  for (const thread of fetchedThreads.threads.values()) {
    const threadData = await processThread(thread);
    if (threadData) {
      channelData.threads.push(threadData);
    }
  }

  return channelData;
};

const processThread = async (thread: AnyThreadChannel): Promise<Thread> => {
  const threadName = thread.name;
  const returnThread: Thread = {
    name: threadName,
    couplets: [],
  };

  const messages = await thread.messages.fetch();
  if (messages.size === 0) {
    console.log('  │  │  └─🧵 ❌ No messages to process');
    return null;
  }
  console.log(
    `  │  │  ├─🧵 Processing ${messages.size} messages from thread: ${thread.name}`,
  );

  const orderedMessages = [...messages.values()].reverse();
  const couplets: Couplet[] = [];
  let currentCouplet: Couplet = { humanMessage: null, aiResponse: [] };
  const initialMessagePrefix = 'Starting new chat with initial message:\n\n> ';
  orderedMessages.forEach((message) => {
    if (!message.content) {
      return;
    }
    const messageRecord: MessageRecord = {
      speakerName: message.author.username,
      speakerId: message.author.id,
      content: message.content,
      timestamp: message.createdTimestamp.toString(),
      jumpUrl: message.url,
      // Assuming attachments are desired in the output, convert collection to array
      attachments: message.attachments.map((attachment) => ({
        name: attachment.name,
        url: attachment.url,
      })),
    };

    // Check if this is the first message or a human message
    if (
      message.content.includes(initialMessagePrefix) ||
      message.author.bot === false
    ) {
      if (message.content.includes(initialMessagePrefix)) {
        messageRecord.content = message.content.replace(
          initialMessagePrefix,
          '',
        );
      }
      // Save the previous couplet if it has an AI response
      if (currentCouplet.aiResponse.length > 0) {
        couplets.push(currentCouplet);
      }
      // Start a new couplet with the human message
      currentCouplet = { humanMessage: messageRecord, aiResponse: [] };
    } else {
      // This is an AI response, so add it to the current couplet
      currentCouplet.aiResponse.push(messageRecord);
    }
  });

  // Push the last couplet if it wasn't pushed yet
  if (currentCouplet.aiResponse.length > 0) {
    couplets.push(currentCouplet);
  }
  returnThread.couplets = couplets;
  return returnThread;
};

export function getDateString() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed
  const day = currentDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
