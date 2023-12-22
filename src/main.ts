import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SlackTestService } from './frontends/slack/slackTest.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const sts = await app.resolve(SlackTestService);
  sts.helloWorldMethod();

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
