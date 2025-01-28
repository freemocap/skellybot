import { Injectable } from '@nestjs/common';
import { YoutubeTranscriptService } from '../../../core/fetch/fetch-youtube-transcript.service';
import { Context, SlashCommand, SlashCommandContext, Options } from 'necord';
import { CacheType, ChatInputCommandInteraction } from 'discord.js';
import { YoutubeTranscriptRequestDto } from './youtube-transcript-request.dto';

@Injectable()
export class DiscordFetchYoutubeTranscriptCommand {
  constructor(
    private readonly youtubeTranscriptService: YoutubeTranscriptService,
  ) {}

  @SlashCommand({
    name: 'fetch-youtube-transcript',
    description: 'Fetch the transcript of a YouTube URL or video ID.',
  })
  public async handleYoutubeTranscriptCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: true })
    YoutubeTranscriptRequestDto?: YoutubeTranscriptRequestDto,
  ) {
    await interaction.deferReply();
    const url = YoutubeTranscriptRequestDto.url_or_id;
    if (!url) {
      await interaction.editReply({
        content: 'Please provide a YouTube URL or video ID.',
      });
      return;
    }

    await this.sendInitialReply(
      `Retrieving YouTube transcript for ${url}`,
      interaction,
    );

    try {
      const transcript =
        await this.youtubeTranscriptService.fetchTranscript(url);
      await interaction.editReply({
        content: `Transcript for ${url}:\n${JSON.stringify(
          transcript,
          null,
          2,
        )}`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `Error fetching transcript: ${error.message}`,
      });
    }
  }

  private async sendInitialReply(
    promptText: string,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    const pleaseWaitText = 'Fetching transcript, please wait...';
    const initialMessageText = `Original Prompt:\n > ${promptText} \n\n`;
    await interaction.editReply({
      content: `${initialMessageText} ${pleaseWaitText}`,
    });
    return initialMessageText;
  }
}
