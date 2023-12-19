import { Injectable } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
} from 'necord';
import { DEV_GUILD } from '../constants';

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
  public async onLength(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: TextDto,
  ) {
    return interaction.reply({
      content: `Dang, dude, I can't believe that ${text}! That's wiiiiiild`,
    });
  }
}
