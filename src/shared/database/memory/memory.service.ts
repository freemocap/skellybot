import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { Memory } from './memory.schema';

@Injectable()
export class MemoryService {
  constructor(@InjectModel('Memory') private memoryModel: Model<Memory>) {}

  async createSession() {
    const sessionId = new ObjectId().toString();
    const newMemory = new this.memoryModel({
      sessionId,
    });
    return await newMemory.save();
  }

  async getChatHistory(sessionId: string) {
    return await this.memoryModel.findOne({ sessionId });
  }
}
