import * as fs from 'fs';
import * as path from 'path';

type Attachment = {
  name: string;
  url: string;
};

type Message = {
  speakerName: string;
  speakerId: string;
  content: string;
  timestamp: number;
  jumpUrl: string;
  attachments: Attachment[];
};

type Thread = {
  name: string;
  messages: Message[];
};

type ChannelData = {
  name: string;
  threads: Thread[];
};

type Channel = {
  name: string;
  data: ChannelData;
};

type Category = {
  name: string;
  channels: Channel[];
};

type Server = {
  serverName: string;
  categories: Category[];
};

// Utility function to create a directory if it doesn't exist
const createDirectory = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

// Function to write markdown file for each thread
const writeMarkdownFile = (filePath: string, content: string) => {
  fs.writeFileSync(filePath, content);
  console.log(`Markdown file created: ${filePath}`);
};
const sanitizeFileName = (input: string): string => {
  return input.replace(/[<>:"/\\|?*]+/g, '-');
};

// Function to format message into markdown
const formatMessageToMarkdown = (message: Message): string => {
  let markdownContent = `**${message.speakerName}**: ${message.content}\n\n`;
  if (message.attachments.length > 0) {
    message.attachments.forEach((attachment) => {
      markdownContent += `![${attachment.name}](${attachment.url})\n\n`;
    });
  }
  return markdownContent;
};

// Main function to process JSON data and create markdown files
const processDiscordData = (jsonData: Server) => {
  const serverDirectory = path.join(__dirname, jsonData.serverName);
  createDirectory(serverDirectory);

  jsonData.categories.forEach((category) => {
    const categoryDirectory = path.join(serverDirectory, category.name);
    createDirectory(categoryDirectory);

    category.channels.forEach((channel) => {
      const channelDirectory = path.join(categoryDirectory, channel.name);
      createDirectory(channelDirectory);
      channel.data.threads.forEach((thread) => {
        const sanitizedThreadName = sanitizeFileName(thread.name);
        const threadFilePath = path.join(
          channelDirectory,
          `${sanitizedThreadName}.md`,
        );
        let markdownContent = `# ${sanitizedThreadName}\n\n`;

        thread.messages.forEach((message) => {
          markdownContent += formatMessageToMarkdown(message);
        });

        writeMarkdownFile(threadFilePath, markdownContent);
      });
    });
  });
};

// Function to read JSON file and start processing
const convertJsonToMarkdown = (jsonFilePath: string) => {
  //verify file exist
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Error: JSON file does not exist: ${jsonFilePath}`);
    return;
  }

  fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading JSON file: ${err}`);
      return;
    }
    console.log(`JSON file read successfully: ${jsonFilePath}`);
    const jsonData: Server = JSON.parse(data);
    processDiscordData(jsonData);
  });
};

// Replace 'jsonFilePath' with the path to your JSON file
const jsonFilePath =
  '/Users/jon/Sync/skellybot-data/2024-03-22T22-35-22.104Z/jonmatthis_s_server-2024-03-22T22-35-59.945Z.json';

// Start processing JSON file
convertJsonToMarkdown(jsonFilePath);
