import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
} from 'necord';
import { DEV_GUILD, OPENAI_API_KEY } from '../constants';
import { OpenAI } from 'langchain/llms/openai';
import { ChatPromptTemplate } from 'langchain/prompts';

export class TextDto {
  @StringOption({
    name: 'text',
    description: 'Your text',
    required: true,
  })
  text: string;
}

@Injectable()
export class DiscordChatService {
  private _model: OpenAI<any>;
  private _logger: Logger;

  constructor(logger: Logger) {
    this._logger = logger;
  }

  createModel() {
    if (!this._model) {
      this._model = new OpenAI({
        modelName: 'gpt-3.5-turbo',
        openAIApiKey: OPENAI_API_KEY,
      });
    }

    return this._model;
  }

  @SlashCommand({
    name: 'chat',
    description: 'chat service',
    guilds: [DEV_GUILD],
  })
  public async onChat(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: TextDto,
  ) {
    await interaction.deferReply();
    const model = this.createModel();

    const promptTemplate = ChatPromptTemplate.fromMessages([
      ['system', 'You were having a conversation with a human about {topic}'],
      ['human', '{text}'],
    ]);
    const chain = promptTemplate.pipe(model);
    // @ts-ignore
    const channelDescription = interaction.channel.topic;
    const result = await chain.invoke({
      topic: channelDescription,
      text,
    });

    return interaction.editReply({
      content: result,
    });
  }
}
