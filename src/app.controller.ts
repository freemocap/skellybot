import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HelloTwoService } from './HelloTwoService';

@Controller()
export class AppController {
  private appService: AppService;
  private helloTwo: HelloTwoService;
  constructor(appService: AppService, helloTwo: HelloTwoService) {
    this.appService = appService;
    this.helloTwo = helloTwo;
  }

  @Get('/hello')
  getHello(): string {
    return this.helloTwo.getOtherHello();
  }
}
