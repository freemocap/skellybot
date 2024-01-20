import {
  IsString,
  IsIn,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsMimeType,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SpeechToTextDto {
  @IsMimeType({
    each: true,
    message:
      'File must be in one of the following formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.',
  })
  @Type(() => Object)
  file: any;

  @IsOptional()
  @IsIn(['whisper-1'])
  model: 'whisper-1' = 'whisper-1';

  @IsOptional()
  @IsString({ message: 'Language code must be a valid ISO-639-1 string.' })
  language?: string; // ISO-639-1 format

  @IsOptional()
  @IsString({ message: 'Prompt must be a string.' })
  @Max(4096, {
    message: 'Prompt must be less than or equal to 4096 characters.',
  })
  prompt?: string;

  @IsOptional()
  @IsIn(['json', 'text', 'srt', 'verbose_json', 'vtt'])
  response_format: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt' =
    'verbose_json';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature: number = 0;

  constructor(partial: Partial<SpeechToTextDto>) {
    Object.assign(this, partial);
  }
}
