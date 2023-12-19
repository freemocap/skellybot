import { Injectable } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
} from 'necord';
import { DEV_GUILD, OPENAI_API_KEY } from '../constants';
const { OpenAI } = require('langchain/llms/openai');

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

    const model = new OpenAI({
      modelName: 'gpt-3.5-turbo',
      openAIApiKey: OPENAI_API_KEY,
    });

    console.log('Text received ' + text);
    const llmResult = await model.predict(text);
    console.log('Response returned ' + llmResult);

    return interaction.editReply({
      content: llmResult,
    });
  }
}
