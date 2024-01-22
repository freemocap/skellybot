import { LangchainService } from '../../../ai/langchain/langchain.service';
import { Injectable, Logger } from '@nestjs/common';
import { Chatbot, ChatbotDocument } from './chatbot.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ChatbotManagerService {
  private _chatbots: Map<string, ChatbotDocument> = new Map();
  constructor(
    @InjectModel(Chatbot.name)
    private readonly _chatbotModel: Model<ChatbotDocument>,
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

    const chatbot = new this._chatbotModel({
      chatbotId,
      chain,
      memory,
    });
    this._chatbots.set(chatbotId, chatbot);
    this._logger.log(`Chatbot with id: ${chatbotId} created successfully`);

    return chatbot.save();
  }

  public async updateMemory(humanMessage: string, aireponse: strnkm);
  public getChatbotById(chatbotId: string | number) {
    try {
      this._logger.log(`Fetching chatbot with id: ${chatbotId}`);
      return this._chatbots.get(String(chatbotId));
    } catch (error) {
      this._logger.error(`Could not find chatbot for chatbotId: ${chatbotId}`);
      throw error;
    }
  }
}
