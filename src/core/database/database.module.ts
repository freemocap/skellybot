import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GcpModule } from '../gcp/gcp.module';
import { DatabaseConfigService } from './database-config.service';
import { ConversationsModule } from './collections/conversations/conversations.module';
import { UsersModule } from './collections/users/users.module';

@Module({
  imports: [
    GcpModule,

    MongooseModule.forRootAsync({
      imports: [GcpModule],
      useClass: DatabaseConfigService,
    }),
    UsersModule,
    ConversationsModule,
  ],
  providers: [],
  exports: [UsersModule, ConversationsModule],
})
export class DatabaseModule {}
