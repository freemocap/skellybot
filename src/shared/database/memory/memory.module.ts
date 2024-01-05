import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MemorySchema } from './memory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Memory', schema: MemorySchema }]),
  ],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
