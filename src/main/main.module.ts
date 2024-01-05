import { Module } from '@nestjs/common';
import { SlackInterfaceModule } from '../interfaces/chat/slack/slackInterface.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';
import { DiscordInterfaceModule } from '../interfaces/chat/discord/discord-interface.module';
import { DatabaseModule } from '../shared/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.slack', '.env.discord', '.env.mongo'],
    }),
    DiscordInterfaceModule,
    SlackInterfaceModule,
    DatabaseModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
