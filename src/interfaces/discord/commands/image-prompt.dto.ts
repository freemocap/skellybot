import { BooleanOption, StringOption } from 'necord';

export class ImagePromptDto {
  @StringOption({
    name: 'prompt',
    description: 'Starting text for the chat',
    required: true,
  })
  prompt: string = '';

  @BooleanOption({
    name: 'use_context',
    description:
      'Whether to include text from this Thread/Channel in the image generation prompt',
    required: false,
  })
  useContext: boolean;

  @BooleanOption({
    name: 'natural_style',
    description: 'Set `True` to use the `natural` style (default is `vivid`)',
    required: false,
  })
  naturalStyle: boolean;

  @BooleanOption({
    name: 'use_exact_prompt',
    description:
      'Set `True` to use the exact prompt provided without any modifications',
    required: false,
  })
  useExactPrompt: boolean;

  @StringOption({
    name: 'context_length',
    description:
      '(if `use_context`) #messages to use in the context window, -1 for all (default: 5)',
    required: false,
  })
  contextLength?: number;
}
