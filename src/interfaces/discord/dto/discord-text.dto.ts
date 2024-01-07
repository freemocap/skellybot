import { StringOption } from 'necord';

export class DiscordTextDto {
  @StringOption({
    name: 'text',
    description: 'Your text',
    required: true,
  })
  text: string;
}
