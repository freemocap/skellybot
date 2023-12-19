import { Injectable } from '@nestjs/common';
import { REST } from 'discord.js';

@Injectable()
export class MyDiscordService {
  async stuff() {
    console.log('hello change');
    // const commands = [
    //   {
    //     name: 'ping',
    //     description: 'Replies with Pong!',
    //   },
    // ];
    //
    // const rest = new REST({ version: '10' }).setToken();
    //
    // try {
    //   console.log('Started refreshing application (/) commands.');
    //
    //   await rest.put(Routes.applicationCommands(''), {
    //     body: commands,
    //   });
    //
    //   console.log('Successfully reloaded application (/) commands.');
    // } catch (error) {
    //   console.error(error);
    // }
  }
}
