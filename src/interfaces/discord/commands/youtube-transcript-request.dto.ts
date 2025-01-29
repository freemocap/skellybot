import { StringOption } from 'necord';

export class YoutubeTranscriptRequestDto {
  @StringOption({
    name: 'video_id',
    description:
      'The youtube video id (the part after "youtube.com/watch?v=", e.g. "dQw4w9WgXcQ")',
    required: true,
  })
  video_id: string = '';
}
