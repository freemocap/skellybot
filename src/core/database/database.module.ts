import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GcpModule } from '../gcp/gcp.module';
import { UsersModule } from './schema/users/users.module';
import { DatabaseConfigService } from './services/database-config.service';
import { ConversationsModule } from './schema/conversations/conversations.module';

@Module({
  imports: [
    GcpModule,

    MongooseModule.forRootAsync({
      imports: [GcpModule],
      useClass: DatabaseConfigService,
    }),
    // CatsModule,
    UsersModule,
    ConversationsModule,
  ],
  providers: [],
  exports: [UsersModule, ConversationsModule],
})
export class DatabaseModule {}
