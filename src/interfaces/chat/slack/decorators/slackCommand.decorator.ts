import { SetMetadata } from '@nestjs/common';

export const SLACK_COMMAND_METADATA_KEY = '__SLACK_COMMAND__';

export interface SlackCommandArgs {
  command: string;
}

export function SlackCommand(command: string) {
  return SetMetadata(SLACK_COMMAND_METADATA_KEY, { command });
}
