import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class DiscordPingService {
  @SlashCommand({
    name: 'hello',
    description: 'Ping-Pong Command',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    console.log('hello');
    return interaction.reply({ content: 'Pong!' });
  }
}
