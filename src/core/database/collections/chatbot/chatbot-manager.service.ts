import { LangchainService } from '../../../ai/langchain/langchain.service';
import { Injectable, Logger } from '@nestjs/common';
import { Chatbot, ChatbotDocument } from './chatbot.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ChatbotManagerService {
  constructor(
    @InjectModel(Chatbot.name)
    private readonly _chatbotModel: Model<ChatbotDocument>,
    private readonly _logger: Logger,
    private readonly _langchainService: LangchainService,
  ) {}
  private async findOne(chatbotId: string): Promise<ChatbotDocument> {
    return this._chatbotModel.findOne({ chatbotId: chatbotId }).exec();
  }
  async findAll(): Promise<ChatbotDocument[]> {
    return this._chatbotModel.find().exec();
  }

  public async getOrCreateChatbot(chatbotId: string) {
    const existingChatbot = await this.findOne(chatbotId);

    if (existingChatbot) {
      return existingChatbot;
    }

    return this.createBot(chatbotId);
  }
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
    this._logger.log(`Chatbot with id: ${chatbotId} created successfully`);

    return chatbot.save();
  }

  public async updateMemory(
    chatbotId: string,
    humanMessage: string,
    aiResponse: string,
  ) {
    try {
      const chatbot = await this.findOne(chatbotId);

      chatbot.memory.saveContext(
        { input: humanMessage },
        { output: aiResponse },
      );
      // @ts-ignore
      chatbot.save();
    } catch (error) {
      this._logger.error(
        `Could not update memory for chatbot with id: ${chatbotId} \n\n ${error}`,
      );
      throw error;
    }
  }
  public getChatbotById(chatbotId: string) {
    try {
      this._logger.log(`Fetching chatbot with id: ${chatbotId}`);
      return this.findOne(chatbotId);
    } catch (error) {
      this._logger.error(`Could not find chatbot for chatbotId: ${chatbotId}`);
      throw error;
    }
  }
}
