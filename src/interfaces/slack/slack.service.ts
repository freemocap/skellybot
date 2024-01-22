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
import { ChatbotManagerService } from '../../core/database/collections/chatbot/chatbot-manager.service';
import { ChatbotResponseService } from '../../core/database/collections/chatbot/chatbot-response.service';

@Injectable()
export class SlackService {
  constructor(
    private readonly _botManagerService: ChatbotManagerService,
    private readonly _botReponseService: ChatbotResponseService,
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
      const id = message.ts;
      const { text } = message as GenericMessageEvent;
      await this._botManagerService.createBot(id);
      const stream = this._botReponseService.streamResponse(id, text, {
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
    await this._botManagerService.createBot(id);

    const response = await this._botReponseService.generateAiResponse(
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
