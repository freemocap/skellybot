import { IsNumber, IsString } from 'class-validator';

export class TextGenerationDto {
  @IsString()
  prompt: string;

  @IsString()
  model: string = 'gpt-4o';

  @IsNumber()
  temperature: number = 0.7;

  @IsNumber()
  max_tokens: number = 300;

  constructor(partial: Partial<TextGenerationDto>) {
    Object.assign(this, partial);
  }
}
