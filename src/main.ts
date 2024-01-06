import { NestFactory } from '@nestjs/core';
import { MainModule } from './main/main.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);

  const options = new DocumentBuilder()
    .setTitle('SkellyBot 💀🤖✨')
    .setDescription(
      'The NestJS Swagger API docs for SkellyBot: https://github.com/freemocap/skellybot',
    )
    .setVersion('1.0')
    .addTag('skelly')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
