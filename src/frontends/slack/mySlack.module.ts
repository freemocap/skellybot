import { Module } from '@nestjs/common';
import { GcpModule } from '../../gcp/gcp.module';
import { SlackTestService } from './slackTest.service';
import { createSlackModule } from './createSlackModule';

@Module({
  imports: [createSlackModule(), GcpModule],
  providers: [SlackTestService],
})
export class MySlackModule {}
