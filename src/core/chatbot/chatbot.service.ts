import { Chatbot } from './chatbot.dto';
import { LangchainService } from '../ai/langchain/langchain.service';
import { Injectable, Logger } from '@nestjs/common';
import { LangchainChainService } from '../ai/langchain/langchain-chain.service';

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
    private readonly _langchainChainService: LangchainChainService,
    private readonly _langchainService: LangchainService,
  ) {}

  public async createChatbotOld(chatbotId: string, modelName?: string) {
    this._logger.log(
      `Creating chatbot with id: ${chatbotId} and model: ${modelName}`,
    );
    const chain =
      await this._langchainService.createMongoMemoryChatChain(modelName);

    // @ts-ignore
    const chatbot = { chain } as Chatbot;
    this._chatbots.set(chatbotId, chatbot);
    this._logger.log(`Chatbot with id: ${chatbotId} created successfully`);

    return chatbot;
  }

  public async createChatbot(chatbotId: string, modelName?: string) {
    this._logger.log(
      `Creating chatbot with id: ${chatbotId} and language model (llm): ${modelName}`,
    );
    const { chain, memory } =
      await this._langchainChainService.createBufferMemoryChain(modelName);

    // @ts-ignore
    const chatbot = { chain, memory } as Chatbot;
    this._chatbots.set(chatbotId, chatbot);
    this._logger.log(`Chatbot with id: ${chatbotId} created successfully`);

    return chatbot;
  }
  public async generateAiResponse(
    chatbotId: string | number,
    humanMessage: string,
    additionalArgs: object,
  ) {
    this._logger.log(
      `Responding to message '${humanMessage}' with chatbotId: ${chatbotId}`,
    );
    const chatbot = this.getChatbotById(chatbotId);
    return await chatbot.chain.invoke({
      text: humanMessage,
      ...additionalArgs,
    });
  }

  getChatbotById(chatbotId: string | number) {
    try {
      this._logger.log(`Fetching chatbot with id: ${chatbotId}`);
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
    this._logger.log(
      `Streaming response to humanMessage: \n\n"${humanMessage}"\n\n with chatbotId: ${chatbotId}`,
    );

    const normalizedOptions = {
      ...new StreamResponseOptions(),
      ...options,
    };
    const { splitAt } = normalizedOptions;
    const chatbot = this.getChatbotById(chatbotId);
    const chatStream = await chatbot.chain.stream({
      input: humanMessage,
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
        this._logger.log(`Streaming chunk of data: ${subStreamResult}`);
        yield {
          data: streamedResult,
          theChunk: subStreamResult,
          didResetOccur,
        };
        tokens = 0;
        didResetOccur = false;
      }
    }
    this._logger.log('Stream complete');
    yield {
      data: streamedResult,
      theChunk: subStreamResult,
    };

    chatbot.memory.saveContext(
      { input: humanMessage },
      { output: streamedResult },
    );
  }
}
