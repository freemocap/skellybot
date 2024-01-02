import { StringOption } from 'necord';

export class HumanTextDto {
  @StringOption({
    name: 'text',
    description: 'Your text',
    required: true,
  })
  humanText: string;
}
