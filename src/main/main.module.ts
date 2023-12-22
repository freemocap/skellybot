import { Module } from '@nestjs/common';
import { MyDiscordModule } from '../interfaces/chat/discord/myDiscord.module';
import { MySlackModule } from '../interfaces/chat/slack/mySlack.module';
import { MainController } from './main.controller';

@Module({
  imports: [MyDiscordModule, MySlackModule],
  controllers: [MainController],
})
export class MainModule {}
