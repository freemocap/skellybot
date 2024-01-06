import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module';
import { DatabaseConnectionService } from './database-connection.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/test'),
    CatsModule,
    UsersModule,
  ],
  providers: [DatabaseConnectionService],
  exports: [DatabaseConnectionService],
})
export class DatabaseModule {}
