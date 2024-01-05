import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from 'discord.js';
import { UserService } from './user.service';
import { UserSchema } from './user.schema';
import { DatabaseMongooseModule } from '../database-mongoose.module';
import { UserConnectionService } from './user-connection.service';

@Module({
  imports: [
    DatabaseMongooseModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UserService, UserConnectionService],
})
export class UserModule {}
