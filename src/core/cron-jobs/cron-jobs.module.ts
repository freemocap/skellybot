import { Module } from '@nestjs/common';
import CronJobsService from './cron-jobs.service';

@Module({
  imports: [],
  providers: [CronJobsService],
  exports: [CronJobsService],
})
export class CronJobsModule {}
