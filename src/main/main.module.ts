import { Module } from '@nestjs/common';
import { SlackModule } from '../interfaces/slack/slack.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';
import { DiscordModule } from '../interfaces/discord/discord.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.slack', '.env.discord', '.env.mongo'],
    }),
    SlackModule,
    DiscordModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
