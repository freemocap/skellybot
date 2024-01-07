import { Injectable } from '@nestjs/common';
import { SlackCommand } from './decorators/slack-command.decorator';
import { v4 } from 'uuid';
import {
  App,
  GenericMessageEvent,
  SlackCommandMiddlewareArgs,
  SlackEventMiddlewareArgs,
} from '@slack/bolt';
import { SlackMessage } from './decorators/slack-message.decorator';
import { BotsService } from '../../core/database/schema/bots/bots.service';
import { BotDto } from '../../core/database/schema/bots/bot.dto';
import { UsersService } from '../../core/database/schema/users/users.service';

@Injectable()
export class SlackService {
  constructor(
    private readonly _usersService: UsersService,
    private readonly _botsService: BotsService,
    private readonly _app: App,
  ) {}

  @SlackMessage()
  async handleBotMessages({
    say,
    message,
  }: SlackEventMiddlewareArgs<'message'>) {
    if (
      message.subtype === undefined ||
      message.subtype === 'bot_message' ||
      message.subtype === 'file_share' ||
      message.subtype === 'thread_broadcast'
    ) {
      // const id = message.ts;
      const { text } = message as GenericMessageEvent;

      const user = await this._usersService.getOrCreate({ slackId: say.name });
      const contextRoute = {
        interface: 'slack',
        serverId: null,
        categoryId: null,
        channelId: message.channel,
        threadId: null,
      };
      const botDto: BotDto = {
        botId: message.channel,
        ownerId: user.slackId,
        contextRoute: contextRoute,
      };

      await this._botsService.createBot(botDto);

      const stream = this._botsService.streamResponse(botDto.botId, text, {
        topic: '',
      });
      const response = await say({ text: 'incoming', thread_ts: message.ts });
      for await (const block of stream) {
        await this._app.client.chat.update({
          text: block.data,
          ts: response.ts,
          channel: response.channel,
        });
      }
    }
  }

  @SlackCommand('/help') // handle command
  async help({ command, ack, say, respond }: SlackCommandMiddlewareArgs) {
    await ack();
    await respond({
      text: 'Here are the available commands: /query, /help',
    });
  }

  @SlackCommand('/query') // handle command
  async command({ command, ack, say, respond }: SlackCommandMiddlewareArgs) {
    await ack();
    await respond({
      text: command.text,
      response_type: 'in_channel',
    });
    const id = v4();
    // await this._botsService.createBot(id); // Disable for now, TODO - extract the botDto stuff from above so i can do this whosit right

    const response = await this._botsService.generateAiResponse(
      id,
      command.text,
      { topic: '' },
    );
    await say({
      text: response,
    });
  }
}

// summarize emily dickinson's life in 50 words
