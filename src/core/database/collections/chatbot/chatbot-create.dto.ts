import { RunnableSequence } from 'langchain/runnables';

export class CreateChatbotDto {
  readonly chain: RunnableSequence<any, any>;
  readonly memory?: any;
}
