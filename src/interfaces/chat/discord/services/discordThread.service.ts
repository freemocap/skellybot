import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILDS } from '../../../../shared/config/constants';
import { TextDto } from '../dto/textDto';

@Injectable()
export class DiscordThreadService {
  constructor(private readonly _logger: Logger) {}

  @SlashCommand({
    name: 'skelly',
    description:
      'Opens a thread at this location and sets up a conversation with with the bot.',
    guilds: DEV_GUILDS,
  })
  public async onThreadCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() startingText: TextDto,
  ) {
    const { text } = startingText;
    this._logger.log(
      `Creating thread with starting text:'${text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
    );

    // @ts-ignore
    await interaction.channel.threads.create({
      name: text || 'new thread',
      autoArchiveDuration: 60,
      reason: 'wow this is a thread',
    });
  }
}
