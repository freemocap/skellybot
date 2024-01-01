import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Injectable } from '@nestjs/common';
import { SlackService } from 'nestjs-slack-bolt/dist/services/slack.service';
import {
  SLACK_COMMAND_METADATA_KEY,
  SlackCommandArgs,
} from './slackCommand.decorator';
import {
  SLACK_MESSAGE_METADATA_KEY,
  SlackMessageArgs,
} from './slackMessage.decorator';

@Injectable()
export class SlackCommandMethodDiscovery {
  constructor(
    private readonly _discoveryService: DiscoveryService,
    private readonly _client: SlackService,
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
      this._client.app.command(command, boundHandler);
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
      this._client.app.message(message, boundHandler);
    });
  }
}
