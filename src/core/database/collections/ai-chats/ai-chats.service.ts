import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AiChatCreateDto, UpdateAiChatDto } from './ai-chat-create.dto';
import { v4 as uuidv4 } from 'uuid';
import { AiChat, AiChatDocument } from './ai-chat.schema';
import { Couplet } from '../couplets/couplet.schema';
import { flattenContextRoute } from './context-route.helper';

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
    // Flatten the context route for easier querying
    const flattenedContext = flattenContextRoute(createAiChatDto.contextRoute);

    const createdAiChat = new this.aiChatModel({
      ...createAiChatDto,
      ...flattenedContext, // Spread the flattened fields
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
        path: 'couplets',
        populate: [
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

    return await this.aiChatModel
      .findOneAndUpdate(
        { aiChatId: aiChatId },
        { $push: { couplets: { $each: updateAiChatDto.couplets } } },
        { new: true },
      )
      .exec();
  }

  async updateAiChat(aiChat: AiChatDocument): Promise<AiChatDocument> {
    const existingChat = await this.aiChatModel
      .findOne({ aiChatId: aiChat.aiChatId })
      .exec();
    if (!existingChat) {
      throw new Error(`AiChat with id ${aiChat.aiChatId} not found`);
    }

    // When updating, also update the flattened fields
    const flattenedContext = flattenContextRoute(aiChat.contextRoute);

    return this.aiChatModel
      .findOneAndUpdate(
        { aiChatId: aiChat.aiChatId },
        {
          $set: {
            modelName: aiChat.modelName,
            contextInstructions: aiChat.contextInstructions,
            contextRoute: aiChat.contextRoute,
            ...flattenedContext, // Update flattened fields too
          },
        },
        { new: true },
      )
      .exec();
  }

  async getAiChatById(channelId: string): Promise<AiChatDocument | null> {
    // Now we can query directly by channelId!
    return this.aiChatModel.findOne({ channelId }).exec();
  }

  // === NEW QUERY METHODS USING FLATTENED FIELDS ===

  /**
   * Find all chats in a specific server
   */
  async findByServer(serverId: string): Promise<AiChatDocument[]> {
    return this.aiChatModel.find({ serverId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find all chats in a specific channel
   */
  async findByChannel(channelId: string): Promise<AiChatDocument[]> {
    return this.aiChatModel.find({ channelId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find all chats for a specific user
   */
  async findByUser(userId: string): Promise<AiChatDocument[]> {
    return this.aiChatModel
      .find({ ownerUser: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all chats for a user in a specific server
   */
  async findByUserInServer(
    userId: string,
    serverId: string,
  ): Promise<AiChatDocument[]> {
    return this.aiChatModel
      .find({ ownerUser: userId, serverId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all direct message chats
   */
  async findDirectMessages(): Promise<AiChatDocument[]> {
    return this.aiChatModel
      .find({ isDirectMessage: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find chats by source interface
   */
  async findByInterface(
    sourceInterface: 'discord' | 'slack',
  ): Promise<AiChatDocument[]> {
    return this.aiChatModel
      .find({ sourceInterface })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get chat statistics
   */
  async getChatStats() {
    const totalChats = await this.aiChatModel.countDocuments().exec();
    const discordChats = await this.aiChatModel
      .countDocuments({ sourceInterface: 'discord' })
      .exec();
    const slackChats = await this.aiChatModel
      .countDocuments({ sourceInterface: 'slack' })
      .exec();
    const directMessages = await this.aiChatModel
      .countDocuments({ isDirectMessage: true })
      .exec();

    return {
      total: totalChats,
      discord: discordChats,
      slack: slackChats,
      directMessages,
      serverChats: totalChats - directMessages,
    };
  }
}
