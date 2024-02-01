import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class DiscordPingCommand {
  @SlashCommand({
    name: 'ping',
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
  })
  public async handleWowSlashCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    return interaction.reply({ content: 'Woweeeee!!!!' });
  }
}
