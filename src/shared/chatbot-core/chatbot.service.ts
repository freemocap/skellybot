import { Injectable, Logger } from '@nestjs/common';
import { ChainBuilderService } from '../ai/langchain/chain-builder/chain-builder.service';
import { Chatbot } from './chatbot.dto';

@Injectable()
export class ChatbotService {
  _chatbots: Map<string | number, Chatbot> = new Map();
  constructor(
    private readonly _logger: Logger,
    private readonly _chainBuilderService: ChainBuilderService,
  ) {}

  public async createChatbot(chatbotId: string | number, modelName?: string) {
    const chain = await this._chainBuilderService.createChain(modelName);

    const chatbot = { chain } as Chatbot;
    this._chatbots.set(chatbotId, chatbot);
    return chatbot;
  }

  public async generateAiResponse(
    chatbotId: string | number,
    humanMessage: string,
    additionalArgs: object,
  ) {
    this._logger.log(
      `Responding to message ${humanMessage} with chatbotId: ${chatbotId}`,
    );
    let chatbot: Chatbot;
    try {
      chatbot = this._chatbots.get(chatbotId);
    } catch (error) {
      this._logger.error(
        `Could not find 'chatbot' for 'chatbotId': ${chatbotId}`,
      );
      throw error;
    }
    return await chatbot.chain.invoke({
      text: humanMessage,
      ...additionalArgs,
    });
  }
}
