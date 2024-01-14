import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { v4 as uuidv4 } from 'uuid';
import { Message, MessageDocument } from './message.schema';
import { CreateMessageDto } from './message.dto';

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
    const createdMessage = new this.messageModel({
      ...createMessageDto,
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
}
