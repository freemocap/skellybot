import { Module } from '@nestjs/common';
import { DiscordConfigureServerCommand } from './server-config-command/discord-configure-server.command';
import { DiscordAttachmentService } from '../services/chat-command/discord-attachment.service';
import { OpenaiModule } from '../../../core/ai/openai/openai.module';

@Module({
  imports: [OpenaiModule],
  providers: [DiscordAttachmentService, DiscordConfigureServerCommand],
})
export class DiscordCommandsModule {}
