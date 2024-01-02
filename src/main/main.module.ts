import { Module } from '@nestjs/common';
import { SlackInterfaceModule } from '../interfaces/chat/slack/slackInterface.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';
import { MyDiscordModule } from '../interfaces/chat/discord/myDiscord.module';

@Module({
  imports: [
    MyDiscordModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.slack', '.env.discord'],
    }),
    SlackInterfaceModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
