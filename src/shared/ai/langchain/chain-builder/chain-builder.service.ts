import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAiSecretsService } from '../openAiSecrets.service';
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { BufferMemory } from 'langchain/memory';
import { RunnableSequence } from 'langchain/runnables';

@Injectable()
export class ChainBuilderService {
  private _model: OpenAI<any>;
  private _promptTemplate: ChatPromptTemplate<any, any>;
  private _memory: BufferMemory;
  private _chain: RunnableSequence;

  constructor(
    private readonly _openAiSecrets: OpenAiSecretsService,
    private readonly _logger: Logger,
  ) {}

  async createPrompt() {
    if (!this._promptTemplate) {
      this._logger.log('Creating prompt...');
      this._promptTemplate = ChatPromptTemplate.fromMessages([
        ['system', 'You were having a conversation with a human about {topic}'],
        new MessagesPlaceholder('chatHistory'),
        ['human', '{text}'],
      ]);
    }

    this._logger.log('Returning prompt: ' + this._promptTemplate);
    return this._promptTemplate;
  }

  private async createMemory() {
    this._memory = new BufferMemory({
      returnMessages: true,
      inputKey: 'input',
      outputKey: 'output',
      memoryKey: 'chat_history',
    });
    this._logger.log(`Created memory with key: ${this._memory.memoryKey}`);
    return this._memory;
  }

  async createModel(modelName?: string) {
    if (!this._model) {
      this._logger.log('Creating model...');
      this._model = new OpenAI({
        modelName: modelName || 'gpt-4-1106-preview',
        openAIApiKey: await this._openAiSecrets.getOpenAIKey(),
      });
    }
    this._logger.log(`Returning model: ${this._model.modelName}`);
    return this._model;
  }

  async createChain(modelName?: string) {
    const model = await this.createModel(modelName);
    const prompt = await this.createPrompt();
    const memory = await this.createMemory();

    this._chain = RunnableSequence.from([
      {
        input: (initialInput) => initialInput.input,
        memory: () => memory.loadMemoryVariables({}),
      },
      {
        input: (previousOutput) => previousOutput.input,
        history: (previousOutput) => previousOutput.memory.history,
      },
      prompt,
      model,
    ]);

    this._logger.log(`Created chain: ${this._chain.toJSON()}`);
    return this._chain;
  }
}
