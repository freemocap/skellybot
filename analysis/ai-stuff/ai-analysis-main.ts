import { loadEnvironmentVariables } from '../server-scraper/services/envService';

import * as fs from 'fs';
import * as path from 'path';

function getEnvironmentInfo() {
  const envVariables = loadEnvironmentVariables('../env.analysis');

  const studentIdentifiersPath = envVariables.STUDENT_IDENTIFIERS_JSON;
  const markdownDirectory = envVariables.MARKDOWN_DIRECTORY;
  if (!fs.existsSync(markdownDirectory)) {
    console.error(`Error: Directory does not exist: ${markdownDirectory}`);
    process.exit(1);
  }

  if (!fs.existsSync(studentIdentifiersPath)) {
    console.error(`Error: JSON file does not exist: ${studentIdentifiersPath}`);
    process.exit(1);
  }
  console.log(`Reading student identifiers from ${studentIdentifiersPath}`);
  // Read the student identifiers JSON file
  const studentIdentifiers = JSON.parse(
    fs.readFileSync(studentIdentifiersPath, 'utf8'),
  );
  console.log(
    `Student identifiers read successfully from ${studentIdentifiersPath}`,
  );
  return { studentIdentifiers, markdownDirectory };
}

function loadTextDataFromMarkdownFiles(dir: string): Record<string, string> {
  let dataTree: Record<string, string> = {};
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Combine the dataTree with results from the subdirectory
      dataTree = { ...dataTree, ...loadTextDataFromMarkdownFiles(fullPath) };
    } else if (path.extname(file).toLowerCase() === '.md') {
      console.log(`Reading markdown file: ${fullPath}`);
      dataTree[fullPath] = fs.readFileSync(fullPath, 'utf8');
    }
  }
  console.log('Markdown file data successfully loaded.');
  console.log(`Total markdown files found: ${Object.keys(dataTree).length}`);
  const printLength = 100;
  console.log(`Markdown file paths and their first ${printLength} characters:`);

  for (const [filePath, content] of Object.entries(dataTree)) {
    console.log(`${filePath}: ${content.substring(0, printLength)}...`);
  }

  return dataTree;
}

function aiAnalyzeTextTree(
  textDataTree: Record<string, string>,
  environmentVariables: EnvironmentVariables,
) {
  // AI analysis code goes here
  console.log('AI analysis complete!');
}
const output = function () {
  const { studentIdentifiers, markdownDirectory } = getEnvironmentInfo();
  const textDataTree = loadTextDataFromMarkdownFiles(markdownDirectory);
  console.log('Finished loading markdown data');
  aiAnalyzeTextTree(textDataTree, { studentIdentifiers, markdownDirectory });
  console.log('AI analysis complete!');
};
