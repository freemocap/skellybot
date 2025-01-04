import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  // @Cron('5 * * * * *')
  // handle5sCron() {
  //   this.logger.debug(
  //     `Called every time the 'seconds' value == 5, the current time is ${new Date().toLocaleTimeString()}`,
  //   );
  // }
  //
  // @Interval(10000)
  // handleEvery5sCron() {
  //   this.logger.debug(
  //     `Called every 10 seconds - The current time is ${new Date().toLocaleTimeString()}`,
  //   );
  // }

  @Cron('0 4 * * * *')
  handleMinCron() {
    this.logger.debug(
      `Called one an hour, whenever the minute value is '4' -  the current time is ${new Date().toLocaleTimeString()}`,
    );
  }
}

export default CronJobsService;
