import { Injectable } from '@nestjs/common';
import { SlackCommand } from './decorators/slackCommand.decorator';
import { ChatbotService } from '../../../shared/chatbot-core/chatbot.service';
import { v4 } from 'uuid';
import { SlackCommandMiddlewareArgs } from '@slack/bolt';

@Injectable()
export class SlackInterfaceService {
  constructor(private readonly _chatbotCore: ChatbotService) {}

  // @SlackMessageCommand()
  // async message(args: SlackEventMiddlewareArgs) {
  //   console.log('message received');
  // }

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
    await this._chatbotCore.createChatbot(id);

    const response = await this._chatbotCore.generateAiResponse(
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
