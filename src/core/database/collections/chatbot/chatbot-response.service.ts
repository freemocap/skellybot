import { Injectable, Logger } from '@nestjs/common';
import { ChatbotManagerService } from './chatbot-manager.service';
class StreamResponseOptions {
  /**
   * Character limit to split the outgoing data
   */
  splitAt: number = 1800;
}
@Injectable()
export class ChatbotResponseService {
  constructor(
    private readonly _logger: Logger,
    private readonly _chatbotManagerService: ChatbotManagerService,
  ) {}

  public async generateAiResponse(
    chatbotId: string | number,
    humanMessage: string,
    additionalArgs: object,
  ) {
    this._logger.log(
      `Responding to message '${humanMessage}' with chatbotId: ${chatbotId}`,
    );
    const chatbot = this._chatbotManagerService.getChatbotById(chatbotId);
    const aiResponse = await chatbot.chain.invoke({
      text: humanMessage,
      ...additionalArgs,
    });
    this._chatbotManagerService.updateMemory({
      humanMessage,
      aiResponse,
    });

    return aiResponse;
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
    const chatbot = this._chatbotManagerService.getChatbotById(chatbotId);
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
