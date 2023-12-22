import { Injectable } from '@nestjs/common';
import { SlackService } from 'nestjs-slack';

@Injectable()
export class SlackTestService {
  constructor(private service: SlackService) {}

  async helloWorldMethod() {
    await this.service.sendText('Hello world was sent!');
    return 'hello world';
  }
}
