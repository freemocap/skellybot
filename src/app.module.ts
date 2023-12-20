import { Module } from '@nestjs/common';
import { MyDiscordModule } from './discord/myDiscord.module';

@Module({
  imports: [MyDiscordModule],
})
export class AppModule {}
