import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Injectable } from '@nestjs/common';
import {
  SLACK_COMMAND_METADATA_KEY,
  SlackCommandArgs,
} from './slackCommand.decorator';
import {
  SLACK_MESSAGE_METADATA_KEY,
  SlackMessageArgs,
} from './slackMessage.decorator';
import { App } from '@slack/bolt';

@Injectable()
export class SlackCommandMethodDiscovery {
  constructor(
    private readonly _discoveryService: DiscoveryService,
    private readonly _client: App,
  ) {}

  public async bindSlackCommands() {
    // This returns all the methods decorated with our decorator
    const scanResult =
      await this._discoveryService.providerMethodsWithMetaAtKey(
        SLACK_COMMAND_METADATA_KEY,
      );

    scanResult.forEach((result) => {
      const { command } = result.meta as SlackCommandArgs;
      const handler = result.discoveredMethod.handler;
      const that = result.discoveredMethod.parentClass.instance;
      const boundHandler = handler.bind(that);
      this._client.command(command, boundHandler);
    });
  }

  public async bindMessages() {
    // This returns all the methods decorated with our decorator
    const scanResult =
      await this._discoveryService.providerMethodsWithMetaAtKey(
        SLACK_MESSAGE_METADATA_KEY,
      );

    scanResult.forEach((result) => {
      const { message } = result.meta as SlackMessageArgs;
      const handler = result.discoveredMethod.handler;
      const that = result.discoveredMethod.parentClass.instance;
      const boundHandler = handler.bind(that);
      if (message) {
        this._client.message(message, boundHandler);
        return;
      }
      this._client.message(boundHandler);
    });
  }
}
