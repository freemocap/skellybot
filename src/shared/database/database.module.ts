import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module';
import { DatabaseConnectionService } from './database-connection.service';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/test', {
      dbName: 'testtest',
    }),
    CatsModule,
  ],
  providers: [DatabaseConnectionService],
  exports: [DatabaseConnectionService],
})
export class DatabaseModule {}
