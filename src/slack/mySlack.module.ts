import { Module } from '@nestjs/common';
import { SlackModule } from 'nestjs-slack';
import { SLACK_BOT_TOKEN } from '../constants';

@Module({
  imports: [
    SlackModule.forRoot({
      type: 'api',
      token: SLACK_BOT_TOKEN,
    }),
  ],
  providers: [],
})
export class MySlackModule {}
