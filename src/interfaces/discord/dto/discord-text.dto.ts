import { StringOption } from 'necord';

export class DiscordTextDto {
  @StringOption({
    name: 'text',
    description: 'Your text',
    required: false,
  })
  text: string;
}
