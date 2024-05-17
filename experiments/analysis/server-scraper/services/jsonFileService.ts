import * as fs from 'fs';
import * as path from 'path';
import { createDirectory } from './json-to-md-directory';
import { getDateString } from './scrapeService';

export const saveJSONData = async (
  serverData: Record<string, any>,
  saveDirectory: string,
): Promise<string> => {
  // make sure the output directory exists
  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
  }

  // make dir if it doesn;t exist

  createDirectory(saveDirectory);

  const filenameWithDate = path.join(
    saveDirectory,
    sanitizeFilename(serverData['serverName']) +
      '-' +
      getDateString() +
      '.json',
  );
  fs.writeFileSync(filenameWithDate, JSON.stringify(serverData, null, 2));
  console.log(`Saved JSON data to ${filenameWithDate}`);
  return filenameWithDate;
};

const sanitizeFilename = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9]/g, '_');
};
