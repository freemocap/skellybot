import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { YoutubeTranscriptService } from '../../../core/fetch/fetch-youtube-transcript.service';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { CacheType, ChatInputCommandInteraction } from 'discord.js';

@Injectable()
export class DiscordFetchYoutubeTranscriptCommand {
  constructor(
    private readonly logger: Logger,
    private readonly youtubeTranscriptService: YoutubeTranscriptService,
  ) {}

  @SlashCommand({
    name: 'fetch-youtube-transcript',
    description: 'Fetch the transcript of a youtube url or video id.',
  })
  public async handleYoutubeTranscriptCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    await interaction.deferReply();
    const url = interaction.options.getString('url');
    if (!url) {
      await interaction.editReply({
        content: 'Please provide a youtube url or video id',
      });
      return;
    }

    await this.sendInitialReply(
      `Retrieving youtube transcript for ${url}`,
      interaction,
    );

    const transcript = await this.youtubeTranscriptService.fetchTranscript(url);

    await interaction.editReply({
      content: JSON.stringify(transcript),
    });
  }
  private async sendInitialReply(
    promptText: string,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    const pleaseWaitText = 'Generating Image, Please wait...';
    const initialMessageText = `Original Prompt:\n > ${promptText} \n\n`;
    await interaction.editReply({
      content: `${initialMessageText} ${pleaseWaitText}`,
    });
    return initialMessageText;
  }
}
