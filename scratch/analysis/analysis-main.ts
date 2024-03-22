import {
  loadEnvironmentVariables,
  validateEnvironmentVariables,
} from './services/envService';
import { createOutputDirectory } from './services/fileService';
import { startBot } from './services/botService';

const analysisMain = async () => {
  console.log(`Starting the bot, running from ${__dirname}`);

  const envVariables = loadEnvironmentVariables('../../.env.discord');

  const outputDirectory = createOutputDirectory(
    envVariables.OUTPUT_DIRECTORY,
    envVariables.HOME,
  );

  await startBot(
    envVariables.DISCORD_BOT_TOKEN,
    envVariables.TARGET_SERVER_ID,
    outputDirectory,
  );
};

analysisMain().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
