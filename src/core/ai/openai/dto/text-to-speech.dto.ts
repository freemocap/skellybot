import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TextToSpeechDto {
  @IsIn(['tts-1', 'tts-1-hd'])
  model: 'tts-1' | 'tts-1-hd';

  @IsString()
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Input must be a string.' })
  @Max(4096, {
    message: 'Input must be less than or equal to 4096 characters.',
  })
  input: string; // Text to generate audio for, max 4096 characters

  @IsIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

  @IsOptional()
  @IsIn(['mp3', 'opus', 'aac', 'flac'])
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac';

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  speed?: number; // Between 0.25 and 4.0, defaults to 1

  constructor(partial: Partial<TextToSpeechDto>) {
    Object.assign(this, partial);
  }
}
