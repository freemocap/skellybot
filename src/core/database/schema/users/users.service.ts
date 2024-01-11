import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { UserDto } from './user.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(userDto: UserDto): Promise<User> {
    let user: User;
    if ('discordID' in userDto.identifiers && userDto.identifiers.discordID) {
      user = await this.userModel
        .findOne({ discordID: userDto.identifiers.discordID })
        .exec();
    }
    if ('slackID' in userDto.identifiers && userDto.identifiers.slackID) {
      user = await this.userModel
        .findOne({ slackID: userDto.identifiers.slackID })
        .exec();
    }

    return user;
  }

  async getOrCreateUser(userDto: UserDto): Promise<User> {
    const existingUser = await this.findOne(userDto);

    if (existingUser) {
      return existingUser;
    }

    return this.createUser(userDto);
  }

  async createUser(userDto: UserDto): Promise<User> {
    if (await this.findOne(userDto)) {
      throw new HttpException('User ID already exists', HttpStatus.CONFLICT);
    }

    const createdUser = new this.userModel({
      identifiers: userDto.identifiers,
      metadata: userDto.metadata || {},
      uuid: uuidv4(),
    });
    return createdUser.save();
  }

  async update(id: string, userDto: UserDto) {
    const existingUser = await this.userModel.findOne({ id: id }).exec();
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return this.userModel
      .findOneAndUpdate({ id: id }, userDto, { new: true })
      .exec();
  }

  async delete(id: string) {
    const deletedUser = await this.userModel
      .findOneAndDelete({ id: id })
      .exec();
    if (!deletedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return deletedUser;
  }
}
