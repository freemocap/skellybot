import { Controller, Get } from '@nestjs/common';

@Controller()
export class MainController {
  @Get()
  sendHello() {
    return 'hello';
  }

  @Get('/health')
  healthCheck() {
    return 'ok';
  }
}
