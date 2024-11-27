import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ImageGenerationDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsIn(['dall-e-2', 'dall-e-3'])
  model?: 'dall-e-2' | 'dall-e-3';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  n?: number;

  @IsOptional()
  @IsIn(['standard', 'hd'])
  quality?: 'standard' | 'hd';

  @IsOptional()
  @IsIn(['url', 'b64_json'])
  response_format?: 'url' | 'b64_json';

  @IsOptional()
  size?: '1024x1024' | '256x256' | '512x512' | '1792x1024' | '1024x1792';

  @IsOptional()
  @IsIn(['vivid', 'natural'])
  style?: 'vivid' | 'natural';

  @IsOptional()
  @IsString()
  user?: string;

  constructor(partial: Partial<ImageGenerationDto>) {
    Object.assign(this, partial);
  }
}
