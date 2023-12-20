import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return 'hello';
  }

  @Get('/health')
  healthCheck() {
    return 'ok';
  }
}
