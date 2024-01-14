import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserSchema } from './sub-schema/user.schema';
import {
  Identifiers,
  IdentifiersSchema,
} from './sub-schema/identifiers.schema';

//
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Identifiers.name, schema: IdentifiersSchema },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
