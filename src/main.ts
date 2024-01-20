import { NestFactory } from '@nestjs/core';
import { MainModule } from './main/main.module';
import { ValidationPipe } from '@nestjs/common';
import { setupSwaggerUI } from './main/setup-swagger-ui';

async function bootstrap() {
  const app = await NestFactory.create(MainModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  setupSwaggerUI(app);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
  console.log(`SkellyBot Application is running on: ${await app.getUrl()}`);
}

bootstrap();
