import { RunnableSequence } from 'langchain/runnables';

export class Bot {
  readonly chain: RunnableSequence<any, any>;
  readonly memory?: any;
}
