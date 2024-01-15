import { Chatbot } from './bot.dto';
import { LangchainService } from '../ai/langchain/langchain.service';
import { Injectable, Logger } from '@nestjs/common';

class StreamResponseOptions {
  /**
   * Character limit to split the outgoing data
   */
  splitAt: number = 1800;
}

@Injectable()
export class BotService {
  private _chatbots: Map<string, Chatbot> = new Map();
  constructor(
    private readonly _logger: Logger,
    private readonly _langchainService: LangchainService,
  ) {}

  public async createBot(
    chatbotId: string,
    modelName?: string,
    contextInstructions?: string,
  ) {
    this._logger.log(
      `Creating chatbot with id: ${chatbotId} and language model (llm): ${modelName}`,
    );
    const { chain, memory } =
      await this._langchainService.createBufferMemoryChain(
        modelName,
        contextInstructions,
      );

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
    const chatbot = this.getBotById(chatbotId);
    return await chatbot.chain.invoke({
      text: humanMessage,
      ...additionalArgs,
    });
  }

  getBotById(chatbotId: string | number) {
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
    const chatbot = this.getBotById(chatbotId);
    const chatStream = await chatbot.chain.stream({
      input: humanMessage,
      ...additionalArgs,
    });

    let fullStreamedResult = '';
    let subStreamResult = '';
    let didResetOccur = false;
    let tokensInThisChunk = 0;
    const chunkSize = 10;
    for await (const newToken of chatStream) {
      // the full message
      fullStreamedResult += newToken;
      tokensInThisChunk++;
      if (subStreamResult.length < splitAt) {
        subStreamResult += newToken;
      } else {
        //
        subStreamResult = subStreamResult.slice(subStreamResult.length * 0.9);
        subStreamResult += newToken;
        didResetOccur = true;
      }

      if (tokensInThisChunk === chunkSize) {
        this._logger.debug(`Streaming chunk of data: ${subStreamResult}`);
        yield {
          data: fullStreamedResult,
          theChunk: subStreamResult,
          didResetOccur,
        };
        tokensInThisChunk = 0;
        didResetOccur = false;
      }
    }
    this._logger.log('Stream complete');
    yield {
      data: fullStreamedResult,
      theChunk: subStreamResult,
    };

    chatbot.memory.saveContext(
      { input: humanMessage },
      { output: fullStreamedResult },
    );
  }
}
