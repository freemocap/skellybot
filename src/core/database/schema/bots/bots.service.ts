import { Bot } from './bot.schema';
import { Injectable, Logger } from '@nestjs/common';
import { LangchainService } from '../../../ai/langchain/langchain.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BotDto } from './bot.dto';

class StreamResponseOptions {
  /**
   * Character limit to split the outgoing data
   */
  splitAt: number = 1800;
}

@Injectable()
export class BotsService {
  private _bots: Map<string, Bot> = new Map();
  constructor(
    @InjectModel(Bot.name) private readonly _botModel: Model<Bot>,

    private readonly _logger: Logger,
    private readonly _langchainService: LangchainService,
  ) {}

  async findAll(): Promise<Bot[]> {
    return this._botModel.find().exec();
  }

  async findById(id: string): Promise<Bot> {
    return await this._botModel.findOne({ botId: id }).exec();
  }

  public async createBot(botDto: BotDto, modelName?: string) {
    this._logger.log(`Creating bot with language model (llm): ${modelName}`);
    const { chain, memory } =
      await this._langchainService.createBufferMemoryChain(modelName);

    const createdBot = new this._botModel({ ...botDto, chain, memory });

    await createdBot.save();
    // const createdBot = { chain, memory } as Bot;
    this._bots.set(botDto.botId, createdBot);
    this._logger.log(`Chatbot with id: ${botDto.botId} created successfully`);

    return createdBot;
  }
  public async generateAiResponse(
    botId: string | number,
    humanMessage: string,
    additionalArgs: object,
  ) {
    this._logger.log(
      `Responding to message '${humanMessage}' with botId: ${botId}`,
    );
    const bot = this.getChatbotById(botId);
    return await bot.chain.invoke({
      text: humanMessage,
      ...additionalArgs,
    });
  }

  getChatbotById(botId: string | number) {
    try {
      this._logger.log(`Fetching bot with id: ${botId}`);
      return this._bots.get(String(botId));
    } catch (error) {
      this._logger.error(`Could not find bot for botId: ${botId}`);
      throw error;
    }
  }

  async *streamResponse(
    botId: string | number,
    humanMessage: string,
    additionalArgs: any,
    options: StreamResponseOptions = new StreamResponseOptions(),
  ) {
    this._logger.log(
      `Streaming response to humanMessage: \n\n"${humanMessage}"\n\n with botId: ${botId}`,
    );

    const normalizedOptions = {
      ...new StreamResponseOptions(),
      ...options,
    };
    const { splitAt } = normalizedOptions;
    const bot = this.getChatbotById(botId);
    const chatStream = await bot.chain.stream({
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

    bot.memory.saveContext({ input: humanMessage }, { output: streamedResult });
  }
}
