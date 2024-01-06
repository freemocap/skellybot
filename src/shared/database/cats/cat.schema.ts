import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type CatDocument = HydratedDocument<Cat>;

@Schema()
export class Cat {
  @ApiProperty()
  @Prop()
  name: string;

  @ApiProperty()
  @Prop()
  age: number;

  @ApiProperty()
  @Prop()
  breed: string;
}

export const CatSchema = SchemaFactory.createForClass(Cat);
