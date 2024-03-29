import { config } from 'dotenv';
import { fileExistsSync } from 'tsconfig-paths/lib/filesystem';
export interface EnvironmentVariables {
  DISCORD_DEV_BOT_TOKEN: string | undefined;
  TARGET_SERVER_ID: string | undefined;
  OUTPUT_DIRECTORY: string | undefined;
  STUDENT_IDENTIFIERS_JSON: string | undefined;
  MARKDOWN_DIRECTORY: string | undefined;
  ANTHROPIC_API_KEY: string | undefined;
}

export const loadEnvironmentVariables = (
  envPath: string,
): EnvironmentVariables => {
  if (fileExistsSync(envPath) === false) {
    throw new Error(`Environment file does not exist: ${envPath}`);
  }
  console.log(`Loading environment variables from ${envPath}`);
  config({ path: envPath });

  const envVariables = {
    DISCORD_DEV_BOT_TOKEN: process.env.DISCORD_DEV_BOT_TOKEN,
    TARGET_SERVER_ID: process.env.TARGET_SERVER_ID,
    OUTPUT_DIRECTORY: process.env.OUTPUT_DIRECTORY,
    STUDENT_IDENTIFIERS_JSON: process.env.STUDENT_IDENTIFIERS_JSON,
    MARKDOWN_DIRECTORY: process.env.MARKDOWN_DIRECTORY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  validateEnvironmentVariables(envVariables);
  return envVariables;
};

const validateEnvironmentVariables = (env: EnvironmentVariables): void => {
  if (!env.OUTPUT_DIRECTORY) {
    throw new Error('OUTPUT_DIRECTORY is not set');
  }

  if (!env.DISCORD_DEV_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is not set');
  }

  if (!env.TARGET_SERVER_ID) {
    throw new Error('TARGET_SERVER_ID is not set');
  }

  if (!env.STUDENT_IDENTIFIERS_JSON) {
    throw new Error('STUDENT_IDENTIFIERS_JSON is not set');
  }

  if (!env.MARKDOWN_DIRECTORY) {
    throw new Error('MARKDOWN_DIRECTORY is not set');
  }

  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
};
