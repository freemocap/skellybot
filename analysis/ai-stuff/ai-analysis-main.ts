import {
  EnvironmentVariables,
  loadEnvironmentVariables,
} from '../server-scraper/services/envService';

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

function loadTextDataFromMarkdownFiles(dir: string): Record<string, string> {
  let dataTree: Record<string, string> = {};
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (error) {
      console.error(`Error reading file stats: ${fullPath}`, error);
      continue;
    }

    if (stat.isDirectory()) {
      try {
        const subdirectoryData = loadTextDataFromMarkdownFiles(fullPath);
        dataTree = { ...dataTree, ...subdirectoryData };
      } catch (error) {
        console.error(`Error reading directory: ${fullPath}`, error);
      }
    } else if (path.extname(file).toLowerCase() === '.md') {
      try {
        // console.log(`Reading markdown file: ${fullPath}`);
        dataTree[fullPath] = fs.readFileSync(fullPath, 'utf8');
      } catch (error) {
        console.error(`Error reading markdown file: ${fullPath}`, error);
      }
    }
  }
  return dataTree;
}

export interface AnthropicRequest {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  system: string;
  messageString: string;
}

export async function getAnthropicTextResponse(request: AnthropicRequest) {
  console.log(`Getting AI response from request: ${JSON.stringify(request)}`);
  const anthropic = new Anthropic({ apiKey: request.apiKey });

  const aiResponse = await anthropic.messages.create({
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    system: request.system,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: request.messageString,
          },
        ],
      },
    ],
  });

  console.log(JSON.stringify(aiResponse, null, 2));
  return aiResponse;
}

function getAnthropicTextRequestConfig(
  environmentVariables: EnvironmentVariables,
  textContent: string,
) {
  const aiSummarizationRequest = {
    apiKey: environmentVariables.ANTHROPIC_API_KEY,
    model: 'claude-3-opus-20240229',
    system:
      'Summarize this text. Provide your response in markdown format with a #H1 heading for the title, and ##H2 headings and bullet points for the main points...',
    messageString: textContent,
    maxTokens: 4000,
    temperature: 0,
  };
  return aiSummarizationRequest;
}

async function aiAnalyzeTextTree(
  textDataTree: Record<string, string>,
  environmentVariables: EnvironmentVariables,
  markdownDirectory: string,
) {
  // walk through the textDataTree and analyze the text
  // for each text file, send a request to the AI model
  // and then extract the relevant information from the response, and save it out as markdown
  if (!textDataTree) {
    throw new Error('No text data to analyze!');
  }
  if (Object.keys(textDataTree).length === 0) {
    throw new Error('No text data to analyze!');
  }

  if (!fs.existsSync(markdownDirectory)) {
    fs.mkdirSync(markdownDirectory, { recursive: true });
  }

  // Iterate over each markdown file in the textDataTree
  for (const [filePath, textContent] of Object.entries(textDataTree)) {
    const aiSummarizationRequestConfig = getAnthropicTextRequestConfig(
      environmentVariables,
      textContent,
    );

    // Send request to the AI model for each text file
    try {
      const aiSummarizationResponse = await getAnthropicTextResponse(
        aiSummarizationRequestConfig,
      );

      // Process the response and save the new markdown file
      const newFilePath = processAiResponse(
        aiSummarizationResponse,
        filePath,
        markdownDirectory,
      );
      console.log(`Processed file saved: ${newFilePath}`);
    } catch (error) {
      console.error(`Error processing markdown file: ${filePath}`, error);
    }
  }

  console.log('AI analysis complete!');
}

// Helper to process the AI response and format it into markdown content
function processAiResponse(
  aiResponse,
  originalFilePath: string,
  processedDataDirectory: string,
): string {
  // Extract the text content from the AI response
  const textContent = aiResponse.content[0].text;

  // Write the text content to the new file path
  fs.writeFileSync(
    path.join(processedDataDirectory, newFilePath),
    textContent,
    'utf8',
  );

  // Return the path for confirmation or logging
  return newFilePath;
}

async function main() {
  const environmentVariables = loadEnvironmentVariables('../env.analysis');

  const textDataTree = loadTextDataFromMarkdownFiles(
    environmentVariables.MARKDOWN_DIRECTORY,
  );
  console.log('Finished loading markdown data');
  await aiAnalyzeTextTree(
    textDataTree,
    environmentVariables,
    environmentVariables.MARKDOWN_DIRECTORY,
  );
  console.log('AI analysis complete!');
}

main().catch((error) => {
  console.error('An error occurred during the AI analysis:', error);
});
