import { config } from 'dotenv';
interface EnvironmentVariables {
  DISCORD_BOT_TOKEN: string | undefined;
  TARGET_SERVER_ID: string | undefined;
  OUTPUT_DIRECTORY: string | undefined;
}

export const loadEnvironmentVariables = (
  envPath: string,
): EnvironmentVariables => {
  console.log(`Loading environment variables from ${envPath}`);
  config({ path: envPath });

  const envVariables = {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    TARGET_SERVER_ID: process.env.TARGET_SERVER_ID,
    OUTPUT_DIRECTORY: process.env.OUTPUT_DIRECTORY,
  };

  validateEnvironmentVariables(envVariables);
  return envVariables;
};

export const validateEnvironmentVariables = (
  env: EnvironmentVariables,
): void => {
  if (!env.OUTPUT_DIRECTORY) {
    throw new Error('OUTPUT_DIRECTORY is not set');
  }

  if (!env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is not set');
  }

  if (!env.TARGET_SERVER_ID) {
    throw new Error('TARGET_SERVER_ID is not set');
  }
};
