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
    private readonly _userModel: Model<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this._userModel.find().exec();
  }

  async findOne(userDto: UserDto): Promise<User> {
    let user: User;
    if (userDto.discordId) {
      user = await this._userModel
        .findOne({ discordId: userDto.discordId })
        .exec();
    } else if (userDto.slackId) {
      user = await this._userModel.findOne({ slackID: userDto.slackId }).exec();
    }

    return user;
  }

  async getOrCreate(userDto: UserDto): Promise<User> {
    const existingUser = await this.findOne(userDto);

    if (existingUser) {
      return existingUser;
    }

    return this.create(userDto);
  }

  _generateHexColorId() {
    const letters = '0123456789ABCDEF';
    let color = '';
    const digits = 6;
    for (let i = 0; i < digits; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  async create(userDto: UserDto): Promise<User> {
    if (await this.findOne(userDto)) {
      throw new HttpException('User ID already exists', HttpStatus.CONFLICT);
    }

    const createdUser = new this._userModel({
      ...userDto,
      uuid: uuidv4(),
      favoriteColor: this._generateHexColorId() || userDto.favoriteColor,
    });
    return createdUser.save();
  }

  async update(id: string, userDto: UserDto) {
    const existingUser = await this._userModel.findOne({ id: id }).exec();
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return this._userModel
      .findOneAndUpdate({ id: id }, userDto, { new: true })
      .exec();
  }

  async delete(id: string) {
    const deletedUser = await this._userModel
      .findOneAndDelete({ id: id })
      .exec();
    if (!deletedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return deletedUser;
  }
}
