import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GcpModule } from '../gcp/gcp.module';
import { DatabaseConfigService } from './database-config.service';
import { AiChatsModule } from './collections/ai-chats/ai-chats.module';
import { UsersModule } from './collections/users/users.module';
import { CoupletsModule } from './collections/couplets/couplets.module';
import { MessagesModule } from './collections/messages/messages.module';

@Module({
  imports: [
    GcpModule,

    MongooseModule.forRootAsync({
      imports: [GcpModule],
      useClass: DatabaseConfigService,
    }),
    UsersModule,
    AiChatsModule,
    CoupletsModule,
    MessagesModule,
  ],
  providers: [],
  exports: [UsersModule, AiChatsModule, CoupletsModule, MessagesModule],
})
export class DatabaseModule {}
