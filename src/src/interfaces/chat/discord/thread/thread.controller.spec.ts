import { Test, TestingModule } from '@nestjs/testing';
import { ThreadController } from './thread.controller';
import { ThreadService } from './thread.service';

describe('ThreadController', () => {
  let controller: ThreadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThreadController],
      providers: [ThreadService],
    }).compile();

    controller = module.get<ThreadController>(ThreadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
