import * as fs from 'fs';
import path from 'path';

export const createOutputDirectory = (
  outputDirectoryRaw: string | undefined,
  homePath: string | undefined,
): string => {
  if (!outputDirectoryRaw) {
    throw new Error('OUTPUT_DIRECTORY is not set');
  }

  const outputDirectory = outputDirectoryRaw.replace('[home]', homePath ?? '');
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  return outputDirectory;
};

export const saveJSONData = async (
  serverData: Record<string, any>,
  outputDirectory: string,
): Promise<void> => {
  const filenameWithDate = path.join(
    outputDirectory,
    sanitizeFilename(serverData['serverName']) +
      '-' +
      new Date().toISOString() +
      '.json',
  );
  console.log(`Saving data to ${filenameWithDate}`);
  fs.writeFileSync(filenameWithDate, JSON.stringify(serverData, null, 2));
};

const sanitizeFilename = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9]/g, '_');
};
