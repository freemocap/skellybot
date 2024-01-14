import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, ConversationDocument } from './conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  async findAll(): Promise<ConversationDocument[]> {
    return this.conversationModel.find().exec();
  }

  async findOne(id: string): Promise<ConversationDocument> {
    return this.conversationModel.findOne({ id: id }).exec();
  }

  async create(
    createConversationDto: ConversationDto,
  ): Promise<ConversationDocument> {
    const createdConversation = new this.conversationModel({
      ...createConversationDto,
      uuid: uuidv4(),
    });
    return createdConversation.save();
  }

  async update(
    id: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    const existingConversation = await this.conversationModel
      .findOne({ id: id })
      .exec();
    if (!existingConversation) {
      throw new Error(`Conversation with id ${id} not found`);
    }

    // Push the new couplet(s) to the couplet list in the conversation
    return await this.conversationModel
      .findOneAndUpdate(
        { id: id },
        { $push: { couplets: { $each: updateConversationDto.couplets } } },
        { new: true },
      )
      .exec();
  }

  async remove(id: string): Promise<ConversationDocument> {
    const deletedConversation = await this.conversationModel
      .findOneAndDelete({ id: id })
      .exec();
    if (!deletedConversation) {
      throw new Error(`Conversation with id ${id} not found`);
    }
    return deletedConversation;
  }
}
