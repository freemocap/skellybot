import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GcpModule } from '../gcp/gcp.module';
import { UsersModule } from './schema/users/users.module';
import { DatabaseConnectionService } from './services/database-connection.service';

@Module({
  imports: [
    GcpModule,
    MongooseModule.forRoot('mongodb://localhost:27017/test'),
    // CatsModule,
    UsersModule,
  ],
  providers: [],
  exports: [UsersModule],
})
export class DatabaseModule {}
