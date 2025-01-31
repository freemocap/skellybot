import { Injectable } from '@nestjs/common';
import { YoutubeTranscriptService } from '../../../core/fetch/fetch-youtube-transcript.service';
import { Context, SlashCommand, SlashCommandContext, Options } from 'necord';
import {
  AttachmentBuilder,
  CacheType,
  ChatInputCommandInteraction,
} from 'discord.js';
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
    @Options({ required: true }) options: YoutubeTranscriptRequestDto,
  ) {
    await interaction.deferReply();
    const yt_id = options.video_id;
    if (!yt_id) {
      await interaction.editReply({
        content: 'Please provide a YouTube URL or video ID.',
      });
      return;
    }

    await this.sendInitialReply(
      `Retrieving YouTube transcript for ${yt_id}`,
      interaction,
    );

    try {
      const transcript =
        await this.youtubeTranscriptService.fetchTranscript(yt_id);
      const transcriptJSON = JSON.stringify(transcript, null, 2);
      const buffer = Buffer.from(transcriptJSON, 'utf-8');
      const transcriptAttachment = new AttachmentBuilder(buffer, {
        name: `yt_transcript_${yt_id}.json`,
      });

      await interaction.editReply({
        content: `Transcript object retrieved for youtube video id ${yt_id}:\n\`\`\`json\nmetadata:\n${JSON.stringify(
          transcript.metadata,
          null,
          2,
        )}\`\`\``,
        files: [transcriptAttachment],
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
