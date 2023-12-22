import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILDS } from '../../../constants';

@Injectable()
export class DiscordPingService {
  @SlashCommand({
    name: 'hello',
    description: 'Ping-Pong Command',
  })
  public async handleHelloPingCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    return interaction.reply({ content: 'Pong!' });
  }

  @SlashCommand({
    name: 'wow',
    description: 'Wow Command',
    guilds: DEV_GUILDS,
  })
  public async handleWowSlashCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    return interaction.reply({ content: 'Woweeeee!!!!' });
  }
}
