import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class DiscordWowService {
  @SlashCommand({
    name: 'wow',
    description: 'Wow Command',
    guilds: [],
  })
  public async onWow(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Woweeeee!!!!' });
  }
}
