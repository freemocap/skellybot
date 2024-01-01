import { Module } from '@nestjs/common';
import { MyDiscordModule } from '../interfaces/chat/discord/myDiscord.module';
import { SlackInterfaceModule } from '../interfaces/chat/slack/slackInterface.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MyDiscordModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.slack'],
    }),
    SlackInterfaceModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
