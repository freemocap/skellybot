import { loadEnvironmentVariables } from './services/envService';
import { startBot } from './services/botService';

const serverScraperMain = async () => {
  console.log(`Starting the bot, running from ${__dirname}`);

  const envVariables = loadEnvironmentVariables('.env.analysis');

  await startBot(
    envVariables.DISCORD_DEV_BOT_TOKEN,
    envVariables.TARGET_SERVER_ID,
    envVariables.OUTPUT_DIRECTORY,
  );
};

serverScraperMain().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
