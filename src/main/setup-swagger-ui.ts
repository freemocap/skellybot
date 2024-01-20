import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwaggerUI(app): void {
  const options = createSwaggerOptions();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
}

export function createSwaggerOptions() {
  return new DocumentBuilder()
    .setTitle('SkellyBot 💀🤖✨')
    .setDescription(
      'The NestJS Swagger API docs for SkellyBot: https://github.com/freemocap/skellybot',
    )
    .setVersion('1.0')
    .addTag('skelly')
    .addBearerAuth()
    .build();
}
