import { Module } from '@nestjs/common';
import { DiscordPingWowCommand } from './commands/discord-ping-wow.command';
import { NecordModule } from 'necord';

import { DiscordConfigService } from './services/discord-config.service';
import { DiscordStartUpService } from './services/discord-start-up.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/collections/users/users.module';
import { ChatbotModule } from '../../core/chatbot/chatbot.module';
import { AiChatsModule } from '../../core/database/collections/ai-chats/ai-chats.module';
import { CoupletsModule } from '../../core/database/collections/couplets/couplets.module';
import { MessagesModule } from '../../core/database/collections/messages/messages.module';
import { DiscordContextRouteService } from './services/discord-context-route.service';
import { DiscordMongodbService } from './services/discord-mongodb.service';
import { DiscordMessageService } from './services/discord-message.service';
import { OpenaiModule } from '../../core/ai/openai/openai.module';
import { DiscordAttachmentService } from './services/discord-attachment.service';
import { DiscordOnMessageService } from './services/discord-on-message.service';
import { DiscordChatCommand } from './commands/discord-chat.command';
import { DiscordConfigureServerCommand } from './commands/server-config-command/discord-configure-server.command';
import { DiscordThreadService } from './services/discord-thread.service';
import { DiscordServerConfigService } from './commands/server-config-command/discord-server-configuration.service';
import { DiscordContextPromptService } from './services/discord-context-prompt.service';
import { DiscordConfigureCategoryService } from './commands/server-config-command/discord-configure-category.service';
import { DiscordChannelCategoryService } from './commands/server-config-command/discord-configure-channel.service';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    GcpModule,
    UsersModule,
    ChatbotModule,
    AiChatsModule,
    CoupletsModule,
    MessagesModule,
    OpenaiModule,
  ],
  providers: [
    DiscordOnMessageService,
    DiscordMessageService,
    DiscordAttachmentService,
    DiscordContextRouteService,
    DiscordContextPromptService,
    DiscordThreadService,
    DiscordMongodbService,
    DiscordPingWowCommand,
    DiscordChatCommand,
    DiscordConfigureServerCommand,
    DiscordConfigureCategoryService,
    DiscordChannelCategoryService,
    DiscordServerConfigService,
    DiscordStartUpService,
  ],
  exports: [DiscordMongodbService],
})
export class DiscordModule {}
