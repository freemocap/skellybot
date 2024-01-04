import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

const testUser = { id: '000', name: 'testUser' };

const mockUserModel = {
  new: jest.fn().mockResolvedValue(testUser),
  constructor: jest.fn().mockResolvedValue(testUser),
  find: jest.fn().mockResolvedValue([testUser]),
  findOne: jest.fn().mockResolvedValue(testUser),
  findById: jest.fn().mockResolvedValue(testUser),
  create: jest.fn().mockResolvedValue(testUser),
  findByIdAndUpdate: jest.fn().mockResolvedValue(testUser),
  findByIdAndDelete: jest.fn().mockResolvedValue(testUser),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Create
  it('should create a user', async () => {
    expect(await service.create(testUser.id, testUser.name)).toEqual(testUser);
  });

  // Find all
  it('should find all users', async () => {
    expect(await service.findAll()).toEqual([testUser]);
  });

  // Find one
  it('should find one user', async () => {
    expect(await service.findOne(testUser.id)).toEqual(testUser);
  });

  // Update
  it('should update a user', async () => {
    expect(await service.update(testUser.id, testUser.name)).toEqual(testUser);
  });

  // Delete
  it('should delete a user', async () => {
    expect(await service.delete(testUser.id)).toEqual(testUser);
  });
});
