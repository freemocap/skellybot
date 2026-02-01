import { Module } from '@nestjs/common';
import { OpenClawClientService } from './openclaw-client.service';

@Module({
  providers: [OpenClawClientService],
  exports: [OpenClawClientService],
})
export class OpenClawModule {}
