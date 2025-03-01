import { Module } from '@nestjs/common';
import { DiscordFetchYoutubeTranscriptCommand } from './commands/discord-fetch-youtube-transcript.command';
import { YoutubeTranscriptService } from '../../core/fetch/fetch-youtube-transcript.service';
import { GcpModule } from '../../core/gcp/gcp.module';
import { UsersModule } from '../../core/database/collections/users/users.module';
import { AiChatsModule } from '../../core/database/collections/ai-chats/ai-chats.module';
import { CoupletsModule } from '../../core/database/collections/couplets/couplets.module';
import { MessagesModule } from '../../core/database/collections/messages/messages.module';
import { OpenaiModule } from '../../core/ai/openai/openai.module';
import { NecordModule } from 'necord';
import { DiscordConfigService } from './services/discord-config.service';
import { DiscordStartUpService } from './services/discord-start-up.service';
import { DiscordContextRouteService } from './services/discord-context-route.service';
import { DiscordPersistenceService } from './services/discord-persistence.service';
import { DiscordMessageService } from './services/discord-message.service';
import { DiscordAttachmentService } from './services/discord-attachment.service';
import { DiscordOnMessageService } from './services/discord-on-message.service';
import { DiscordChatCommand } from './commands/discord-chat.command';
import { DiscordDeployServerCommand } from './commands/server-config-command/discord-deploy-server-command.service';
import { DiscordThreadService } from './services/discord-thread.service';
import { DiscordServerConfigService } from './commands/server-config-command/discord-server-configuration.service';
import { DiscordContextPromptService } from './services/discord-context-prompt.service';
import { DiscordConfigureCategoryService } from './commands/server-config-command/discord-configure-category.service';
import { DiscordConfigureChannelService } from './commands/server-config-command/discord-configure-channel.service';
import { DiscordImageCommand } from './commands/discord-image.command';
import { DiscordPingWowCommand } from './commands/discord-ping-wow.command';

@Module({
  imports: [
    GcpModule,
    NecordModule.forRootAsync({
      imports: [GcpModule],
      useClass: DiscordConfigService,
    }),
    UsersModule,
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
    DiscordPersistenceService,
    DiscordPingWowCommand,
    DiscordChatCommand,
    DiscordImageCommand,
    DiscordFetchYoutubeTranscriptCommand,
    DiscordDeployServerCommand,
    DiscordConfigureCategoryService,
    DiscordConfigureChannelService,
    DiscordServerConfigService,
    DiscordStartUpService,
    YoutubeTranscriptService, // Add this line to provide YoutubeTranscriptService
  ],
})
export class DiscordModule {}
