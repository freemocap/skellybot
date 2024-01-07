import { RunnableSequence } from 'langchain/runnables';
import { BaseMemory } from '@langchain/core/memory';

export class BotDto {
  readonly ownerId: string;
  readonly botId: string;
  readonly contextRoute: Record<string, string>;

  readonly chain?: RunnableSequence<any, any>;
  readonly memory?: BaseMemory;
}
