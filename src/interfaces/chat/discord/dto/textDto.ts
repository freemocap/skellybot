import { StringOption } from 'necord';

export class TextDto {
  @StringOption({
    name: 'text',
    description: 'Your text',
    required: true,
  })
  text: string;
}
