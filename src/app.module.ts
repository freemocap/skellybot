import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloTwoService } from './HelloTwoService';
import { MyDiscordModule } from './discord/myDiscord.module';

@Module({
  imports: [MyDiscordModule],
})
export class AppModule {}
