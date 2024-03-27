import { loadEnvironmentVariables } from './services/envService';
import { startBot } from './services/botService';

const analysisMain = async () => {
  console.log(`Starting the bot, running from ${__dirname}`);

  const envVariables = loadEnvironmentVariables('../../.env.discord');

  await startBot(
    envVariables.DISCORD_BOT_TOKEN,
    envVariables.TARGET_SERVER_ID,
    envVariables.OUTPUT_DIRECTORY,
  );
};

analysisMain().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
