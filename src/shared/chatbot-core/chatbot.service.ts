import { Injectable, Logger } from '@nestjs/common';
import { ChainBuilderService } from '../ai/langchain/chain-builder/chain-builder.service';
import { Chatbot } from './chatbot.dto';

class StreamResponseOptions {
  /**
   * Character limit to split the outgoing data
   */
  splitAt: number = 1800;
}

@Injectable()
export class ChatbotService {
  private _chatbots: Map<string, Chatbot> = new Map();
  constructor(
    private readonly _logger: Logger,
    private readonly _chainBuilderService: ChainBuilderService,
  ) {}

  public async createChatbot(chatbotId: string | number, modelName?: string) {
    const chain = await this._chainBuilderService.createChain(modelName);

    const chatbot = { chain } as Chatbot;
    this._chatbots.set(String(chatbotId), chatbot);
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
    const chatbot = this.getChatbotById(chatbotId);
    return await chatbot.chain.invoke({
      text: humanMessage,
      ...additionalArgs,
    });
  }

  getChatbotById(chatbotId: string | number) {
    try {
      return this._chatbots.get(String(chatbotId));
    } catch (error) {
      this._logger.error(`Could not find chatbot for chatbotId: ${chatbotId}`);
      throw error;
    }
  }
  async *streamResponse(
    chatbotId: string | number,
    humanMessage: string,
    additionalArgs: any,
    options: StreamResponseOptions = new StreamResponseOptions(),
  ) {
    const normalizedOptions = {
      ...new StreamResponseOptions(),
      ...options,
    };
    const { splitAt } = normalizedOptions;
    const chatbot = this.getChatbotById(chatbotId);
    const chatStream = await chatbot.chain.stream({
      text: humanMessage,
      ...additionalArgs,
    });

    let streamedResult = '';
    let subStreamResult = '';
    let didResetOccur = false;
    let tokens = 0;
    for await (const chunk of chatStream) {
      // the full message
      streamedResult += chunk;
      tokens++;
      if (subStreamResult.length < splitAt) {
        subStreamResult += chunk;
      } else {
        //
        subStreamResult = subStreamResult.slice(subStreamResult.length * 0.95);
        subStreamResult += chunk;
        didResetOccur = true;
      }

      if (tokens === 30) {
        yield {
          data: streamedResult,
          theChunk: subStreamResult,
          didResetOccur,
        };
        tokens = 0;
        didResetOccur = false;
      }
    }

    yield {
      data: streamedResult,
      theChunk: subStreamResult,
    };
  }
}
