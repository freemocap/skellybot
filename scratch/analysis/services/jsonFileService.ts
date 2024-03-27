import * as fs from 'fs';
import * as path from 'path';

export const saveJSONData = async (
  serverData: Record<string, any>,
  outputDirectory: string,
): Promise<void> => {
  // make sure the output directory exists
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const filenameWithDate = path.join(
    outputDirectory,
    sanitizeFilename(serverData['serverName']) +
      '-' +
      new Date().toISOString().replace(/:/g, '-') +
      '.json',
  );

  fs.writeFileSync(filenameWithDate, JSON.stringify(serverData, null, 2));
  console.log(`Saved JSON data to ${filenameWithDate}`);
};

const sanitizeFilename = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9]/g, '_');
};
