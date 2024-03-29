import * as fs from 'fs';
import * as path from 'path';
import { Couplet, Server } from './data-types';

// Utility function to create a directory if it doesn't exist
export const createDirectory = (dirPath: string) => {
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
  if (!input) {
    throw new Error('Invalid input for sanitizeFileName');
  }
  return input
    .replace(/ /g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single one
    .replace(/[<>:"/\\|?*]+/g, ''); // Remove illegal characters
};

// Main function to process JSON data and create markdown files
const discordServerToMarkdownDirectory = (
  jsonData: Server,
  serverDirectory: string,
): Record<string, string> => {
  console.log(`🌳 Creating markdown files for server: ${jsonData.serverName}`);
  const markdownStringJson = {};

  createDirectory(serverDirectory);
  if (!jsonData.categories || !Array.isArray(jsonData.categories)) {
    throw new Error('Invalid JSON structure: "categories" is not an array.');
  }

  jsonData.categories.forEach((category, catIndex) => {
    const categoryDirectory = path.join(
      serverDirectory,
      sanitizeFileName(category.name),
    );
    createDirectory(categoryDirectory);
    console.log(`├─📁 Category: ${category.name}`);

    if (!category.channels || !Array.isArray(category.channels)) {
      throw new Error(
        'Invalid JSON structure: "channels" is not an array in category.',
      );
    }
    category.channels.forEach((channel, chanIndex) => {
      if (!channel.data || !channel.data.threads) {
        throw new Error(
          'Invalid JSON structure: "data" or "threads" is missing in channel.',
        );
      }
      const channelDirectory = path.join(
        categoryDirectory,
        sanitizeFileName(channel.name),
      );
      createDirectory(channelDirectory);
      console.log(`│  ├─📂 Channel: ${channel.name}`);

      if (!Array.isArray(channel.data.threads)) {
        throw new Error(
          'Invalid JSON structure: "threads" is not an array in channel data.',
        );
      }
      channel.data.threads.forEach((thread, threadIndex) => {
        const sanitizedThreadName = sanitizeFileName(thread.name);
        const threadFilePath = path.join(
          channelDirectory,
          `${sanitizedThreadName}.md`,
        );
        let markdownContent = `# ${sanitizedThreadName}\n\n`;
        let coupletIndex = 0;
        if (!Array.isArray(thread.couplets)) {
          throw new Error(
            'Invalid JSON structure: "couplets" is not an array in thread.',
          );
        }
        thread.couplets.forEach((couplet) => {
          coupletIndex++;
          markdownContent += formatCoupletToMarkdown(couplet, coupletIndex);
        });

        writeMarkdownFile(threadFilePath, markdownContent);
        markdownStringJson[threadFilePath] = markdownContent;

        // Check if it's the last thread in the last channel of the last category
        if (
          catIndex === jsonData.categories.length - 1 &&
          chanIndex === category.channels.length - 1 &&
          threadIndex === channel.data.threads.length - 1
        ) {
          console.log(`│  │  └─📄 Thread: ${thread.name}`);
        } else {
          console.log(`│  │  ├─📄 Thread: ${thread.name}`);
        }
      });

      // Check if it's the last channel in the category
      if (chanIndex === category.channels.length - 1) {
        console.log(`│  └─`);
      }
    });

    // Check if it's the last category
    if (catIndex === jsonData.categories.length - 1) {
      console.log(`└─`);
    }
  });

  console.log('🌳 Finished converting JSON to markdown!!');
  return markdownStringJson;
};

function formatCoupletToMarkdown(
  couplet: Couplet,
  coupletIndex: number,
): string {
  let markdownString = `## Couplet ${coupletIndex}\n\n`;

  // Add Human Message
  markdownString += `### Human Message\n`;
  markdownString += `${couplet.humanMessage.content}\n\n`;

  // Add AI Response(s)
  markdownString += `### AI Response\n`;
  if (couplet.aiResponse.length === 1) {
    markdownString += `${couplet.aiResponse[0].content}\n\n`;
  } else if (couplet.aiResponse.length > 1) {
    couplet.aiResponse.forEach((response) => {
      markdownString += `${response.content}\n\n`;
    });
  }

  return markdownString;
}
// Function to read JSON file and start processing
export const convertJsonToMarkdown = (jsonFilePath: string) => {
  //verify file exist
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Error: JSON file does not exist: ${jsonFilePath}`);
    return;
  }
  let jsonData: Server;
  try {
    const data = fs.readFileSync(jsonFilePath, 'utf8');
    console.log(`JSON file read successfully: ${jsonFilePath}`);
    jsonData = JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file: ${jsonFilePath}`, error);
    return;
  }

  const markdownRootPath = path.dirname(jsonFilePath);
  const markdownTextJson = discordServerToMarkdownDirectory(
    jsonData,
    markdownRootPath,
  );
  // removeEmptyDirectories(markdownRootPath);
  console.log(JSON.stringify(markdownTextJson, null, 2));
  console.log('Finished converting JSON to markdown!!');
  return markdownTextJson;
};
