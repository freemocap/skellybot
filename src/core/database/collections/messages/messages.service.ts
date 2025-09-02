import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { v4 as uuidv4 } from 'uuid';
import { Message, MessageDocument } from './message.schema';
import { CreateMessageDto } from './message.dto';
import { flattenContextRoute } from '../ai-chats/context-route.helper';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async findAll(): Promise<MessageDocument[]> {
    return this.messageModel.find().exec();
  }

  async findOne(messageId: string): Promise<MessageDocument> {
    return this.messageModel.findOne({ messageId: messageId }).exec();
  }

  public async createMessage(
    createMessageDto: CreateMessageDto,
  ): Promise<MessageDocument> {
    // Flatten the context route for easier querying
    const flattenedContext = flattenContextRoute(createMessageDto.contextRoute);

    const createdMessage = new this.messageModel({
      ...createMessageDto,
      ...flattenedContext, // Spread the flattened fields
      uuid: uuidv4(),
    });
    return createdMessage.save();
  }

  async remove(messageId: string): Promise<MessageDocument> {
    const deletedMessage = await this.messageModel
      .findOneAndDelete({ messageId: messageId })
      .exec();
    if (!deletedMessage) {
      throw new Error(`Message with messageId ${messageId} not found`);
    }
    return deletedMessage;
  }

  // === NEW QUERY METHODS USING FLATTENED FIELDS ===

  /**
   * Find all messages from a specific user
   */
  async findByUser(speakerId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ speakerId })
      .sort({ messageSentTimestamp: -1 })
      .exec();
  }

  /**
   * Find all messages in a specific channel
   */
  async findByChannel(channelId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ channelId })
      .sort({ messageSentTimestamp: -1 })
      .exec();
  }

  /**
   * Find all messages in a specific server
   */
  async findByServer(serverId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ serverId })
      .sort({ messageSentTimestamp: -1 })
      .exec();
  }

  /**
   * Find all messages from a user in a specific channel
   */
  async findByUserInChannel(
    speakerId: string,
    channelId: string,
  ): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ speakerId, channelId })
      .sort({ messageSentTimestamp: -1 })
      .exec();
  }

  /**
   * Find all messages in a thread
   */
  async findByThread(threadId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ threadId })
      .sort({ messageSentTimestamp: -1 })
      .exec();
  }

  /**
   * Find messages with pagination
   */
  async findByChannelPaginated(
    channelId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ channelId })
      .sort({ messageSentTimestamp: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Count messages by various criteria
   */
  async countMessagesByUser(speakerId: string): Promise<number> {
    return this.messageModel.countDocuments({ speakerId }).exec();
  }

  async countMessagesByChannel(channelId: string): Promise<number> {
    return this.messageModel.countDocuments({ channelId }).exec();
  }

  async countMessagesByServer(serverId: string): Promise<number> {
    return this.messageModel.countDocuments({ serverId }).exec();
  }
}
