import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILDS } from '../../../../shared/config/constants';
import { TextDto } from '../dto/textDto';
import { ChainBuilderService } from '../../../../shared/ai/langchain/chain-builder/chain-builder.service';

@Injectable()
export class DiscordChatService {
  constructor(
    private readonly chainBuilderService: ChainBuilderService,
    private readonly _logger: Logger,
  ) {}

  @SlashCommand({
    name: 'chat',
    description: 'chat service',
    guilds: DEV_GUILDS,
  })
  public async onChat(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: TextDto,
  ) {
    this._logger.log('Received chat request with text: ' + text);
    await interaction.deferReply();
    this._logger.log('Deferred reply');

    const chain =
      await this.chainBuilderService.createChain('gpt-4-1106-preview');

    // @ts-ignore
    const channelDescription = interaction.channel.topic;
    const result = await chain.invoke({
      topic: channelDescription,
      text,
    });

    return interaction.editReply({
      content: result,
    });
  }
}
