import { RunnableSequence } from 'langchain/runnables';

export class Chatbot {
  readonly chain: RunnableSequence<any, string>;
}
