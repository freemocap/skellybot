import { Injectable, Logger } from '@nestjs/common';
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { BufferMemory } from 'langchain/memory';
import { RunnableSequence } from 'langchain/runnables';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAiSecretsService } from '../openAiSecrets.service';

@Injectable()
export class ChainBuilderService {
  private promptTemplate: ChatPromptTemplate<any, any>;
  private memory: BufferMemory;
  private model: OpenAI<any>;
  private chain: RunnableSequence<any, string>;

  constructor(
    private readonly _openAiSecrets: OpenAiSecretsService,
    private readonly _logger: Logger,
  ) {}

  private createPromptTemplate() {
    this.promptTemplate = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You were having a conversation with a human about {contextDescription}',
      ],
      new MessagesPlaceholder('history'),
      ['human', '{input}'],
    ]);
    this._logger.log(`Created prompt template`);
  }

  private createMemory(): void {
    this.memory = new BufferMemory({
      returnMessages: true,
      inputKey: 'input',
      outputKey: 'output',
      memoryKey: 'history',
    });
    this._logger.log(`Created memory`);
  }

  async createModel(modelName?: string): Promise<void> {
    this.model = new OpenAI({
      modelName: modelName || 'gpt-4-1106-preview',
      openAIApiKey: await this._openAiSecrets.getOpenAIKey(),
    });
  }

  private createChain(): void {
    this.chain = RunnableSequence.from([
      {
        input: (initialInput: any) => initialInput.input,
        memory: () => this.memory.loadMemoryVariables({}),
      },
      {
        input: (previousOutput: any) => previousOutput.input,
        history: (previousOutput: any) => previousOutput.memory.history,
      },
      this.promptTemplate,
      this.model,
    ]);
  }

  async buildChain(modelName: string): Promise<RunnableSequence> {
    this.createPromptTemplate();
    this.createMemory();
    await this.createModel(modelName);
    this.createChain();

    return this.chain;
  }
}
