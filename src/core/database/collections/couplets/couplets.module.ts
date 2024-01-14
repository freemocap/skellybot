import { Module } from '@nestjs/common';
import { CoupletsService } from './couplets.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Couplet, CoupletSchema } from './couplet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Couplet.name, schema: CoupletSchema }]),
  ],
  providers: [CoupletsService],
  exports: [CoupletsService],
})
export class CoupletsModule {}
