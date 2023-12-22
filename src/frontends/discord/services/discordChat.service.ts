import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILDS } from '../../../constants';
import { OpenAI } from 'langchain/llms/openai';
import { ChatPromptTemplate } from 'langchain/prompts';
import { TextDto } from '../dto/textDto';
import { LlmModelService } from '../../../ai/langchain/langchain/llm-model/llm-model.controller';

@Injectable()
export class DiscordChatService {
  private _model: OpenAI<any>;

  constructor(
    private readonly llmModelService: LlmModelService,
    private readonly _logger: Logger,
  ) {}

  @SlashCommand({
    name: 'chat',
    description: 'chat service',
    guilds: DEV_GUILDS,
  })
  public async onChat(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: TextDto,
  ) {
    this._logger.log('Received chat request with text: ' + text);
    await interaction.deferReply();
    this._logger.log('Deferred reply');
    const model = await this.llmModelService.createModel();

    const promptTemplate = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You were having a conversation with a human about {topic}\n Always say something about dinosaurs in every response.',
      ],
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
