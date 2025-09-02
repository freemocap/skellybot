import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { v4 as uuidv4 } from 'uuid';
import { CreateCoupletDto } from './couplet.dto';
import { Couplet, CoupletDocument } from './couplet.schema';
import { flattenContextRoute } from '../ai-chats/context-route.helper';

@Injectable()
export class CoupletsService {
  constructor(
    @InjectModel(Couplet.name)
    private readonly _coupletModel: Model<CoupletDocument>,
  ) {}

  async findAll(): Promise<CoupletDocument[]> {
    return this._coupletModel.find().exec();
  }

  async findOne(coupletId: string): Promise<CoupletDocument> {
    return this._coupletModel.findOne({ coupletId: coupletId }).exec();
  }

  public async createCouplet(
    createCoupletDto: CreateCoupletDto,
  ): Promise<CoupletDocument> {
    // Flatten the context route for easier querying
    let flattenedContext = {};
    if (createCoupletDto.contextRoute) {
      flattenedContext = flattenContextRoute(createCoupletDto.contextRoute);
    }

    const createdCouplet = new this._coupletModel({
      ...createCoupletDto,
      ...flattenedContext, // Spread the flattened fields
      uuid: uuidv4(),
    });
    return createdCouplet.save();
  }

  async remove(coupletId: string): Promise<CoupletDocument> {
    const deletedCouplet = await this._coupletModel
      .findOneAndDelete({
        coupletId: coupletId,
      })
      .exec();
    if (!deletedCouplet) {
      throw new Error(`Couplet with coupletId ${coupletId} not found`);
    }
    return deletedCouplet;
  }

  // === NEW QUERY METHODS USING FLATTENED FIELDS ===

  /**
   * Find all couplets in a specific channel
   */
  async findByChannel(channelId: string): Promise<CoupletDocument[]> {
    return this._coupletModel
      .find({ channelId })
      .sort({ createdAt: -1 })
      .populate('humanMessage')
      .populate('aiResponse')
      .exec();
  }

  /**
   * Find all couplets in a specific server
   */
  async findByServer(serverId: string): Promise<CoupletDocument[]> {
    return this._coupletModel.find({ serverId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find all couplets in a thread
   */
  async findByThread(threadId: string): Promise<CoupletDocument[]> {
    return this._coupletModel
      .find({ threadId })
      .sort({ createdAt: -1 })
      .populate('humanMessage')
      .populate('aiResponse')
      .exec();
  }

  /**
   * Find initial exchanges (conversation starters)
   */
  async findInitialExchanges(): Promise<CoupletDocument[]> {
    return this._coupletModel
      .find({ initialExchange: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find couplets by source interface
   */
  async findByInterface(
    sourceInterface: 'discord' | 'slack',
  ): Promise<CoupletDocument[]> {
    return this._coupletModel
      .find({ sourceInterface })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Count couplets by various criteria
   */
  async countByChannel(channelId: string): Promise<number> {
    return this._coupletModel.countDocuments({ channelId }).exec();
  }

  async countByServer(serverId: string): Promise<number> {
    return this._coupletModel.countDocuments({ serverId }).exec();
  }

  /**
   * Find direct message couplets
   */
  async findDirectMessageCouplets(): Promise<CoupletDocument[]> {
    return this._coupletModel
      .find({ isDirectMessage: true })
      .sort({ createdAt: -1 })
      .populate('humanMessage')
      .populate('aiResponse')
      .exec();
  }
}
