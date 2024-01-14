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

  async findAll(populateData?: boolean): Promise<ConversationDocument[]> {
    if (populateData) {
      return this.conversationModel.find().populate('owner').exec();
    } else {
      return this.conversationModel.find().exec();
    }
  }

  async findOne(
    conversationId: string,
    populateData?: boolean,
  ): Promise<ConversationDocument> {
    if (populateData) {
      return this.conversationModel
        .findOne({ conversationId: conversationId })
        .populate('owner')
        .exec();
    } else {
      return this.conversationModel.findOne({ id: conversationId }).exec();
    }
  }

  public async createConversation(
    createConversationDto: ConversationDto,
  ): Promise<ConversationDocument> {
    const createdConversation = new this.conversationModel({
      ...createConversationDto,
      uuid: uuidv4(),
    });
    return createdConversation.save();
  }

  public async updateConversation(
    conversationId: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    const existingConversation = await this.conversationModel
      .findOne({ id: conversationId })
      .exec();
    if (!existingConversation) {
      throw new Error(`Conversation with id ${conversationId} not found`);
    }

    // Push the new couplet(s) to the couplet list in the conversation
    return await this.conversationModel
      .findOneAndUpdate(
        { id: conversationId },
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
