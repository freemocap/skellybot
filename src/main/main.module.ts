import { Module } from '@nestjs/common';
import { SlackModule } from '../interfaces/slack/slack.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.slack', '.env.discord', '.env.mongo'],
    }),
    SlackModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
