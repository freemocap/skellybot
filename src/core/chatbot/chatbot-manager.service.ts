import { LangchainChatbot } from './chatbot.dto';
import { LangchainService } from '../ai/langchain/langchain.service';
import { Injectable, Logger } from '@nestjs/common';
import { AiChatDocument } from '../database/collections/ai-chats/ai-chat.schema';
import { OpenaiChatService } from '../ai/openai/openai-chat.service';

@Injectable()
export class ChatbotManagerService {
  private _langchain_chatbots: Map<string, LangchainChatbot> = new Map();
  private readonly logger: Logger = new Logger(ChatbotManagerService.name);

  constructor(
    private readonly _langchainService: LangchainService,
    private readonly _openaiChatService: OpenaiChatService,
  ) {}

  public async createBot(
    chatbotId: string,
    modelName?: string,
    contextInstructions?: string,
  ) {
    this.logger.log(
      `Creating chatbot with id: ${chatbotId} and language model (llm): ${modelName}`,
    );
    const { chain, memory } =
      await this._langchainService.createBufferMemoryChain(
        modelName,
        contextInstructions,
      );

    const chatbot = { chain, memory } as LangchainChatbot;
    this._langchain_chatbots.set(chatbotId, chatbot);
    this.logger.log(`Chatbot with id: ${chatbotId} created successfully`);

    return chatbot;
  }

  public async loadChatbotFromAiChatDocument(
    aiChat: AiChatDocument,
  ): Promise<LangchainChatbot> {
    try {
      const { chain, memory } =
        await this._langchainService.createBufferMemoryChain(
          aiChat.modelName,
          aiChat.contextInstructions,
        );
      const chatbot = { chain, memory } as LangchainChatbot;

      this._langchain_chatbots.set(aiChat.aiChatId, chatbot);

      for (const couplet of aiChat.couplets) {
        this.updateChatbotMemory(
          aiChat.aiChatId,
          couplet.humanMessage.content,
          couplet.aiResponse.content,
        );
      }

      this.logger.debug(
        `Chatbot with id: ${aiChat.aiChatId} re-created successfully`,
      );
      return chatbot;
    } catch (error) {
      this.logger.error(
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
    this.logger.log(`Fetching chatbot with id: ${chatbotId}`);
    const chatbot = this._langchain_chatbots.get(String(chatbotId));
    if (!chatbot) {
      throw new Error(`Could not find chatbot with id: ${chatbotId}`);
    }
    return chatbot;
  }
}
