import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyDiscordService } from './discord/myDiscord.service';
import { DiscordPingService } from './discord/discordPing.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const discService = await app.resolve(DiscordPingService);
  // await app.listen(3000);
  discService.onPing();
}

bootstrap();
