import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AiChatCreateDto, UpdateAiChatDto } from './ai-chat-create.dto';
import { v4 as uuidv4 } from 'uuid';
import { AiChat, AiChatDocument } from './ai-chat.schema';
import { Couplet } from '../couplets/couplet.schema';

@Injectable()
export class AiChatsService {
  constructor(
    @InjectModel(AiChat.name)
    private readonly aiChatModel: Model<AiChatDocument>,
  ) {}
  async findAllChatIds(): Promise<string[]> {
    const aiChats = await this.aiChatModel.find().select('aiChatId').exec();
    return aiChats.map((aiChat) => aiChat.aiChatId);
  }

  async findAll(): Promise<AiChatDocument[]> {
    return this.aiChatModel.find().exec();
  }

  async findOne(aiChatId: string): Promise<AiChatDocument> {
    return this.aiChatModel.findOne({ aiChatId: aiChatId }).exec();
  }

  public async createAiChat(
    createAiChatDto: AiChatCreateDto,
  ): Promise<AiChatDocument> {
    const createdAiChat = new this.aiChatModel({
      ...createAiChatDto,
      uuid: uuidv4(),
    });
    return createdAiChat.save();
  }

  public async addCouplets(
    aiChatId: string,
    couplets: [Couplet],
  ): Promise<void> {
    const existingAiChat = await this.aiChatModel
      .findOne({ aiChatId: aiChatId })
      .exec();

    if (!existingAiChat) {
      throw new Error(`AiChat with id ${aiChatId} not found`);
    }

    this._updateAiChat(aiChatId, { couplets });
  }
  async _updateAiChat(
    aiChatId: string,
    updateAiChatDto: UpdateAiChatDto,
  ): Promise<AiChatDocument> {
    const existingAiChat = await this.aiChatModel
      .findOne({ aiChatId: aiChatId })
      .exec();
    if (!existingAiChat) {
      throw new Error(`AiChat with id ${aiChatId} not found`);
    }

    // Push the new couplet(s) to the couplet list in the aiChat
    return await this.aiChatModel
      .findOneAndUpdate(
        { aiChatId: aiChatId },
        { $push: { couplets: { $each: updateAiChatDto.couplets } } },
        { new: true },
      )
      .exec();
  }

  async remove(aiChatId: string): Promise<AiChatDocument> {
    const deletedAiChat = await this.aiChatModel
      .findOneAndDelete({ aiChatId: aiChatId })
      .exec();
    if (!deletedAiChat) {
      throw new Error(`AiChat with id ${aiChatId} not found`);
    }
    return deletedAiChat;
  }
}
