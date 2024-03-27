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
  return input
    .replace(/ /g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single one
    .replace(/[<>:"/\\|?*]+/g, ''); // Remove illegal characters
};

const removeEmptyDirectories = (dirPath: string) => {
  // Read all files and directories within the directory
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // Iterate over each entry within the directory
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    // If the entry is a directory, recurse into it
    if (entry.isDirectory()) {
      removeEmptyDirectories(fullPath);
    }
  }

  // Re-check the directory to see if it's empty after potentially removing subdirectories
  if (fs.readdirSync(dirPath).length === 0) {
    fs.rmdirSync(dirPath);
    console.log(`Removed empty directory: ${dirPath}`);
  }
};

// Function to format message into markdown
const formatMessageToMarkdown = (message: Message): string => {
  const urlString = `[message link](${message.jumpUrl})`;
  let markdownContent = `## **${message.speakerName}**:\n\n ${urlString} \n\n ${message.content}\n\n`;
  if (message.attachments.length > 0) {
    message.attachments.forEach((attachment) => {
      markdownContent += `![${attachment.name}](${attachment.url})\n\n`;
    });
  }
  return markdownContent;
};

// Main function to process JSON data and create markdown files
const processDiscordData = (jsonData: Server, rootDir: string) => {
  const serverDirectory = path.join(
    rootDir,
    sanitizeFileName(jsonData.serverName),
  );
  createDirectory(serverDirectory);

  jsonData.categories.forEach((category) => {
    const categoryDirectory = path.join(
      serverDirectory,
      sanitizeFileName(category.name),
    );
    createDirectory(categoryDirectory);

    category.channels.forEach((channel) => {
      const channelDirectory = path.join(
        categoryDirectory,
        sanitizeFileName(channel.name),
      );
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
export const convertJsonToMarkdown = (jsonFilePath: string) => {
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
    const markdownRootPath = path.dirname(jsonFilePath);
    processDiscordData(jsonData, markdownRootPath);
    removeEmptyDirectories(markdownRootPath);
  });
};

// // Replace 'jsonFilePath' with the path to your JSON file
// const jsonFilePath =
//   'C:/Users/jonma/Sync/skellybot-data/2024-NEU-Capstone/2024-03-27/2024_NEU_Capstone-2024-03-27.json';
// // Start processing JSON file
// convertJsonToMarkdown(jsonFilePath);
