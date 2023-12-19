import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloTwoService {
  getOtherHello(): string {
    return 'Hello World, endurancs!';
  }
}
