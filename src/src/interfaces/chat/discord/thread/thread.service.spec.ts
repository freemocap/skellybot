import { Test, TestingModule } from '@nestjs/testing';
import { ThreadService } from './thread.service';

describe('ThreadService', () => {
  let service: ThreadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreadService],
    }).compile();

    service = module.get<ThreadService>(ThreadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
