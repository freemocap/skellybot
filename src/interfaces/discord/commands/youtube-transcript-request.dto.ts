import { StringOption } from 'necord';

export class YoutubeTranscriptRequestDto {
  @StringOption({
    name: 'url_or_id',
    description: 'Video url or id.',
    required: true,
  })
  url_or_id: string = '';
}
