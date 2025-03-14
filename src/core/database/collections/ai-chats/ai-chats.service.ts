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

  public async getOrCreateAiChat(
    createAiChatDto: AiChatCreateDto,
    populateDocument?: boolean,
  ): Promise<AiChatDocument> {
    const aiChat = await this.aiChatModel.findOne({
      aiChatId: createAiChatDto.aiChatId,
    });

    if (aiChat && populateDocument) {
      return await this._populateDocument(createAiChatDto.aiChatId);
    }

    if (aiChat) {
      return aiChat;
    }

    return this.createAiChat(createAiChatDto);
  }
  private async _populateDocument(aiChatId: string): Promise<AiChatDocument> {
    return await this.aiChatModel
      .findOne({ aiChatId: aiChatId })
      .populate({
        // Populate the 'couplets' field in the AiChat schema
        path: 'couplets',
        populate: [
          // Within each 'Couplet', populate both 'humanMessage' and 'aiResponse' fields
          { path: 'humanMessage', model: 'Message' },
          { path: 'aiResponse', model: 'Message' },
        ],
      })
      .exec();
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
  async updateAiChat(aiChat: AiChatDocument): Promise<AiChatDocument> {
    // Make sure the chat exists
    const existingChat = await this.aiChatModel
      .findOne({ aiChatId: aiChat.aiChatId })
      .exec();
    if (!existingChat) {
      throw new Error(`AiChat with id ${aiChat.aiChatId} not found`);
    }

    // Update the document with the new values
    return this.aiChatModel
      .findOneAndUpdate(
        { aiChatId: aiChat.aiChatId },
        {
          $set: {
            modelName: aiChat.modelName,
            contextInstructions: aiChat.contextInstructions,
            contextRoute: aiChat.contextRoute,
          },
        },
        { new: true },
      )
      .exec();
  }

  async getAiChatById(channelId: string): Promise<AiChatDocument | null> {
    return this.aiChatModel.findOne({ aiChatId: channelId }).exec();
  }
}
