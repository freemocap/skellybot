import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GcpModule } from '../gcp/gcp.module';
import { UsersModule } from './schema/users/users.module';
import { DatabaseConfigService } from './services/database-config.service';
import { ConversationsModule } from './schema/conversations/conversations.module';
import { ContextRoute } from './schema/conversations/sub-schema/context-route.schema';

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
    ContextRoute,
  ],
  providers: [],
  exports: [UsersModule, ConversationsModule, ContextRoute],
})
export class DatabaseModule {}
