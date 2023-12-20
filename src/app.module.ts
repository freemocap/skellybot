import { Module } from '@nestjs/common';
import { MyDiscordModule } from './discord/myDiscord.module';
import { MySlackModule } from './slack/mySlack.module';

@Module({
  imports: [MyDiscordModule, MySlackModule],
})
export class AppModule {}
