import { Module } from '@nestjs/common';
import { DiscordConfigureServerCommand } from './server-config-command/discord-configure-server.command';
import { DiscordChatMessageCommand } from './chat-command/discord-chat.message-command';
import { DiscordModule } from '../discord.module';

@Module({
  imports: [DiscordModule],
  providers: [DiscordConfigureServerCommand, DiscordChatMessageCommand],
})
export class DiscordCommandsModule {}
