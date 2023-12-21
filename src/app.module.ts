import { Module } from '@nestjs/common';
import { MyDiscordModule } from './frontends/discord/myDiscord.module';
import { MySlackModule } from './frontends/slack/mySlack.module';
import { AppController } from './app.controller';

@Module({
  imports: [MyDiscordModule, MySlackModule],
  controllers: [AppController],
})
export class AppModule {}
