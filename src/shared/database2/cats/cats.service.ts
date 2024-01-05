import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cat } from './cat.schema';
import { CreateCatDto } from './create-cat.dto';

@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private readonly catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    return await this.catModel.create(createCatDto);
  }

  async findAll(): Promise<Cat[]> {
    return this.catModel.find().exec();
  }

  async findOne(id: string): Promise<Cat> {
    return this.catModel.findOne({ _id: id }).exec();
  }

  async update(id: string, updateCatDto: CreateCatDto): Promise<Cat> {
    return this.catModel
      .findByIdAndUpdate(id, updateCatDto, { new: true })
      .exec();
  }

  async upsert(filter: object, updateCatDto: CreateCatDto): Promise<Cat> {
    return this.catModel
      .findOneAndUpdate(filter, updateCatDto, { new: true, upsert: true })
      .exec();
  }

  async delete(id: string) {
    const deletedCat = await this.catModel
      .findByIdAndDelete({ _id: id })
      .exec();
    return deletedCat;
  }
}
