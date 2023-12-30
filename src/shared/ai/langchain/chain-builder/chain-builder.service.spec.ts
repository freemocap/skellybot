import { Test, TestingModule } from '@nestjs/testing';

import { ChainBuilderService } from './chain-builder.service';

describe('ChainBuilderService', () => {
  let service: ChainBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChainBuilderService],
    }).compile();

    service = module.get<ChainBuilderService>(ChainBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
