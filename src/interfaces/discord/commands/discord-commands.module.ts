import { Module } from '@nestjs/common';
import { DiscordConfigureServerCommand } from './discord-configure-server-command.service';
import { DiscordAttachmentService } from '../services/chats/discord-attachment.service';
import { OpenaiModule } from '../../../core/ai/openai/openai.module';

@Module({
  imports: [OpenaiModule],
  providers: [DiscordAttachmentService, DiscordConfigureServerCommand],
})
export class DiscordCommandsModule {}
