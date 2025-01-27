import { Module } from '@nestjs/common';
import { YoutubeTranscriptService } from './fetch-youtube-transcript.service';

@Module({
  imports: [],
  providers: [YoutubeTranscriptService],
  exports: [YoutubeTranscriptService],
})
export class FetchModule {}
