import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module';
import { MongoChatHistoryModule } from './memory/mongo-chat-history.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/test'),
    CatsModule,
    MongoChatHistoryModule,
  ],
  providers: [],
})
export class DatabaseModule {}
