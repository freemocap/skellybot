import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from './sub-schema/conversation.schema';
import {
  ContextRoute,
  ContextRouteSchema,
} from './sub-schema/context-route.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ContextRoute.name, schema: ContextRouteSchema },
    ]),
  ],
  providers: [ConversationsService],
})
export class ConversationsModule {}
