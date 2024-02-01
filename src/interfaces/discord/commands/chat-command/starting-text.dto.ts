// TODO - Clean this up, extract commands to the `commands` folder and let this be a "make a thread" service
import { StringOption } from 'necord';

export class StartingTextDto {
  @StringOption({
    name: 'text',
    description: 'Starting text for the chat',
    required: false,
  })
  text: string;
}
