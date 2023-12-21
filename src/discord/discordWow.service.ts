import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILD } from '../constants';

@Injectable()
export class DiscordWowService {
  @SlashCommand({
    name: 'wow',
    description: 'Wow Command',
    guilds: [DEV_GUILD],
  })
  public async onWow(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Woweeeee!!!!' });
  }
}
