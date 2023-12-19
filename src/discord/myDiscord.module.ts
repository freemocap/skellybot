import { Module } from '@nestjs/common';
import { MyDiscordService } from './myDiscord.service';
import { DiscordPingService } from './discordPing.service';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { DISCORD_TOKEN } from '../constants';
import { DiscordWowService } from './discordWow.service';
import { DiscordChatService } from './discordLangchain.service';

@Module({
  imports: [
    NecordModule.forRoot({
      token: DISCORD_TOKEN,
      intents: [IntentsBitField.Flags.Guilds],
    }),
  ],
  providers: [
    MyDiscordService,
    DiscordPingService,
    DiscordWowService,
    DiscordChatService,
  ],
})
export class MyDiscordModule {}
