import { Chatbot } from './chatbot.dto';
import { LangchainService } from '../ai/langchain/langchain.service';
import { Injectable, Logger } from '@nestjs/common';
import { AiChatDocument } from '../database/collections/ai-chats/ai-chat.schema';

@Injectable()
export class ChatbotManagerService {
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

  public async loadChatbotFromAiChatDocument(
    aiChat: AiChatDocument,
  ): Promise<Chatbot> {
    try {
      const { chain, memory } =
        await this._langchainService.createBufferMemoryChain(
          aiChat.modelName,
          aiChat.contextInstructions,
        );
      const chatbot = { chain, memory } as Chatbot;

      this._chatbots.set(aiChat.aiChatId, chatbot);

      for (const couplet of aiChat.couplets) {
        this.updateChatbotMemory(
          aiChat.aiChatId,
          couplet.humanMessage.content,
          couplet.aiResponse.content,
        );
      }

      this._logger.debug(
        `Chatbot with id: ${aiChat.aiChatId} re-created successfully`,
      );
      return chatbot;
    } catch (error) {
      this._logger.error(
        `Could not load chatbot from aiChat: ${aiChat.aiChatId} with error \n ${error} `,
      );
      throw error;
    }
  }

  public async updateChatbotMemory(
    chatbotId: string,
    humanMessage: string,
    aiResponse: string,
  ) {
    const chatbot = this.getChatbotById(chatbotId);
    if (!chatbot) {
      throw new Error(`Could not find chatbot with id: ${chatbotId}`);
    }
    await chatbot.memory.saveContext(
      { input: humanMessage },
      { output: aiResponse },
    );
  }

  public getChatbotById(chatbotId: string | number) {
    this._logger.log(`Fetching chatbot with id: ${chatbotId}`);
    const chatbot = this._chatbots.get(String(chatbotId));
    if (!chatbot) {
      throw new Error(`Could not find chatbot with id: ${chatbotId}`);
    }
    return chatbot;
  }
}
