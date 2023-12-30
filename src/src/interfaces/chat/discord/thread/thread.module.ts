import { Module } from '@nestjs/common';
import { ThreadService } from './thread.service';
import { ThreadController } from './thread.controller';

@Module({
  controllers: [ThreadController],
  providers: [ThreadService],
})
export class ThreadModule {}
