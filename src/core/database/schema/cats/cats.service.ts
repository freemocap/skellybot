import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cat } from './cat.schema';
import { CreateCatDto } from './create-cat.dto';

@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private readonly catModel: Model<Cat>) {}

  async findAll(): Promise<Cat[]> {
    return this.catModel.find().exec();
  }

  async findOne(id: string): Promise<Cat> {
    return this.catModel.findOne({ name: id }).exec();
  }

  async upsert(filter: object, createCatDto: CreateCatDto): Promise<Cat> {
    return this.catModel
      .findOneAndUpdate(
        filter,
        { $set: createCatDto },
        { new: true, upsert: true },
      )
      .exec();
  }

  async delete(name: string) {
    const deletedCat = await this.catModel
      .findOneAndDelete({ name: name })
      .exec();
    if (!deletedCat) {
      throw new Error(`Cat with name ${name} not found`);
    }
    return deletedCat;
  }
}
