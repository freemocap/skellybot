import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { v4 as uuidv4 } from 'uuid';
import { CreateCoupletDto } from './couplet.dto';
import { Couplet, CoupletDocument } from './couplet.schema';

@Injectable()
export class CoupletsService {
  linkedModels = ['humanMessage', 'aiMessage'];
  constructor(
    @InjectModel(Couplet.name)
    private readonly CoupletModel: Model<CoupletDocument>,
  ) {}

  async findAll(): Promise<CoupletDocument[]> {
    return this.CoupletModel.find().exec();
  }

  async findOne(coupletId: string): Promise<CoupletDocument> {
    return this.CoupletModel.findOne({ coupletId: coupletId }).exec();
  }

  public async createCouplet(
    createCoupletDto: CreateCoupletDto,
  ): Promise<CoupletDocument> {
    const createdCouplet = new this.CoupletModel({
      ...createCoupletDto,
      uuid: uuidv4(),
    });
    return createdCouplet.save();
  }

  async remove(coupletId: string): Promise<CoupletDocument> {
    const deletedCouplet = await this.CoupletModel.findOneAndDelete({
      coupletId: coupletId,
    }).exec();
    if (!deletedCouplet) {
      throw new Error(`Couplet with coupletId ${coupletId} not found`);
    }
    return deletedCouplet;
  }
}
