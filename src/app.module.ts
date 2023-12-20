import { Module } from '@nestjs/common';
import { MyDiscordModule } from './discord/myDiscord.module';
import { MySlackModule } from './slack/mySlack.module';
import { AppController } from './app.controller';

@Module({
  imports: [MyDiscordModule, MySlackModule],
  controllers: [AppController],
})
export class AppModule {}
