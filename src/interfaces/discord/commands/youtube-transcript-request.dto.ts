import { StringOption } from 'necord';

export class YoutubeTranscriptRequestDto {
  @StringOption({
    name: 'video_id',
    description:
      'The youtube video id (e.g., "youtube.com/watch?v=[video_id]" or "youtu.be/[video_id]/")',
    required: true,
  })
  video_id: string = '';
}
