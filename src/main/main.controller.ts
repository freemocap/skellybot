import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('skellybot')
@Controller('skellybot')
export class MainController {
  @Get()
  sendHello() {
    return 'hello wow';
  }

  @Get('/health')
  healthCheck() {
    return 'ok';
  }
}
