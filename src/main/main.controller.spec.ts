import { Test, TestingModule } from '@nestjs/testing';
import { MainController } from './main.controller';

describe('AppController', () => {
  let appController: MainController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MainController],
      providers: [],
    }).compile();

    appController = app.get<MainController>(MainController);
  });

  describe('root', () => {
    it('should return "hello wow"', () => {
      expect(appController.sendHello()).toBe('hello wow');
    });
  });
});
