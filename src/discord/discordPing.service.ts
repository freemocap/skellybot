import { Injectable } from '@nestjs/common';
import {
  Context,
  ContextOf,
  Once,
  SlashCommand,
  SlashCommandContext,
} from 'necord';

@Injectable()
export class DiscordPingService {
  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    console.log(`Bot logged in as ${client.user.username}`);
  }
  @SlashCommand({
    name: 'hello',
    description: 'Ping-Pong Command',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    console.log('hello');
    return interaction.reply({ content: 'Pong!' });
  }
}
