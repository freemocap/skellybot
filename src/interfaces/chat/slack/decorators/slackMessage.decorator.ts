import { SetMetadata } from '@nestjs/common';

export const SLACK_MESSAGE_METADATA_KEY = '__SLACK_MESSAGE__';

export interface SlackMessageArgs {
  message: string;
}

export function SlackMessageCommand(message?: string) {
  return SetMetadata(SLACK_MESSAGE_METADATA_KEY, {
    message,
  } as SlackMessageArgs);
}
