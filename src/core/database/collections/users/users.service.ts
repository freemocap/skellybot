import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { UserDto } from './user.dto';
import { v4 as uuidv4 } from 'uuid';
import { flattenUserIdentifiers } from './user-identifiers.helper';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(userDto: UserDto): Promise<UserDocument> {
    let user: UserDocument;

    // Try the new flattened fields first (faster!)
    if ('discord' in userDto.identifiers && userDto.identifiers.discord.id) {
      user = await this.userModel
        .findOne({ discordId: userDto.identifiers.discord.id })
        .exec();
    }
    if (
      !user &&
      'slack' in userDto.identifiers &&
      userDto.identifiers.slack.id
    ) {
      user = await this.userModel
        .findOne({ slackId: userDto.identifiers.slack.id })
        .exec();
    }

    // Fallback to old nested query if not found (for backwards compatibility)
    if (!user) {
      if ('discord' in userDto.identifiers && userDto.identifiers.discord.id) {
        user = await this.userModel
          .findOne({
            'identifiers.discord.userId': userDto.identifiers.discord.id,
          })
          .exec();
      }
      if (
        !user &&
        'slack' in userDto.identifiers &&
        userDto.identifiers.slack.id
      ) {
        user = await this.userModel
          .findOne({ 'identifiers.slack.userId': userDto.identifiers.slack.id })
          .exec();
      }
    }

    return user;
  }

  public async getOrCreateUser(userDto: UserDto): Promise<UserDocument> {
    const existingUser = await this.findOne(userDto);

    if (existingUser) {
      return existingUser;
    }

    return this._createUser(userDto);
  }

  async _createUser(userDto: UserDto): Promise<UserDocument> {
    if (await this.findOne(userDto)) {
      throw new HttpException('User ID already exists', HttpStatus.CONFLICT);
    }

    // Flatten the identifiers for easier querying
    const flattenedIdentifiers = flattenUserIdentifiers(userDto.identifiers);

    const createdUser = new this.userModel({
      identifiers: userDto.identifiers,
      ...flattenedIdentifiers, // Spread the flattened fields
      metadata: userDto.metadata || {},
      uuid: uuidv4(),
    });
    return createdUser.save();
  }

  async update(id: string, userDto: UserDto) {
    const existingUser = await this.userModel.findOne({ uuid: id }).exec();
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    // Flatten the identifiers if they're being updated
    let updateData: any = userDto;
    if (userDto.identifiers) {
      const flattenedIdentifiers = flattenUserIdentifiers(userDto.identifiers);
      updateData = {
        ...userDto,
        ...flattenedIdentifiers,
      };
    }

    return this.userModel
      .findOneAndUpdate({ uuid: id }, updateData, { new: true })
      .exec();
  }

  async delete(id: string) {
    const deletedUser = await this.userModel
      .findOneAndDelete({ uuid: id })
      .exec();
    if (!deletedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return deletedUser;
  }

  // === NEW QUERY METHODS USING FLATTENED FIELDS ===

  /**
   * Find user by Discord ID (fast!)
   */
  async findByDiscordId(discordId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ discordId }).exec();
  }

  /**
   * Find user by Slack ID (fast!)
   */
  async findBySlackId(slackId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ slackId }).exec();
  }

  /**
   * Find user by Discord username
   */
  async findByDiscordUsername(username: string): Promise<UserDocument[]> {
    return this.userModel.find({ discordUsername: username }).exec();
  }

  /**
   * Find user by Slack username
   */
  async findBySlackUsername(username: string): Promise<UserDocument[]> {
    return this.userModel.find({ slackUsername: username }).exec();
  }

  /**
   * Find all users on a specific platform
   */
  async findByPlatform(platform: 'discord' | 'slack'): Promise<UserDocument[]> {
    return this.userModel
      .find({ platforms: platform })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find users who are on both Discord and Slack
   */
  async findCrossPlatformUsers(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        $and: [
          { discordId: { $exists: true } },
          { slackId: { $exists: true } },
        ],
      })
      .exec();
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const totalUsers = await this.userModel.countDocuments().exec();
    const discordUsers = await this.userModel
      .countDocuments({ discordId: { $exists: true } })
      .exec();
    const slackUsers = await this.userModel
      .countDocuments({ slackId: { $exists: true } })
      .exec();
    const crossPlatformUsers = await this.userModel
      .countDocuments({
        $and: [
          { discordId: { $exists: true } },
          { slackId: { $exists: true } },
        ],
      })
      .exec();

    return {
      total: totalUsers,
      discord: discordUsers,
      slack: slackUsers,
      crossPlatform: crossPlatformUsers,
      discordOnly: discordUsers - crossPlatformUsers,
      slackOnly: slackUsers - crossPlatformUsers,
    };
  }

  /**
   * Search users by username across all platforms
   */
  async searchByUsername(searchTerm: string): Promise<UserDocument[]> {
    return this.userModel
      .find({
        $or: [
          { discordUsername: new RegExp(searchTerm, 'i') },
          { slackUsername: new RegExp(searchTerm, 'i') },
        ],
      })
      .exec();
  }
}
