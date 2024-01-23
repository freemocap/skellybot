import { RunnableSequence } from 'langchain/runnables';

export class LangchainChatbot {
  readonly chain: RunnableSequence<any, any>;
  readonly memory?: any;
}
