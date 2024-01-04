import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserService } from './user.service';

@Injectable()
export class UserConnectionService implements OnModuleInit {
  constructor(
    private readonly _logger: Logger,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    const testUserId = '123';
    const testUserName = 'testName';
    const changedTestUserName = 'changedName';

    // Make sure that user isn't already in database
    const existingUser = await this.userService.findOne(testUserId);
    if (existingUser) {
      await this.userService.delete(testUserId);
    }

    const createdUser = await this.userService.create(testUserId, testUserName);
    this._logger.log(`create method success, createdUser: ${createdUser}`);
    if (!createdUser || createdUser.name !== testUserName) {
      this._logger.error('Create method failed!');
      return;
    }

    // Test find all
    const allUsers = await this.userService.findAll();
    this._logger.log(`findAll method success`);
    if (!allUsers || allUsers.length === 0) {
      this._logger.error('findAll method failed!');
      return;
    }

    // Test find one
    const foundUser = await this.userService.findOne(testUserId);
    this._logger.log(`findOne method success, foundUser: ${foundUser}`);
    if (!foundUser || foundUser.id !== testUserId) {
      this._logger.error('Failed to find user');
      return;
    }

    // Test update
    const updatedUser = await this.userService.update(
      testUserId,
      changedTestUserName,
    );
    this._logger.log(`update method success, updatedUser: ${updatedUser}`);
    if (!updatedUser || updatedUser.name !== changedTestUserName) {
      this._logger.error('Failed to update user');
      return;
    }

    // Test delete
    const deletedUser = await this.userService.delete(testUserId);
    this._logger.log(`delete method success, deletedUser: ${deletedUser}`);
    if (!deletedUser) {
      this._logger.error('Failed to delete user');
    }
  }
}
