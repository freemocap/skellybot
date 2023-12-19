import { Module } from '@nestjs/common';
import { MyDiscordService } from './myDiscord.service';
import { DiscordPingService } from './discordPing.service';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';

const DISCORD_TOKEN =
  'MTE4NjY5NzQzMzY3NDE2NjI5Mw.GLH5zY.kNF86Ed-GrE9OGLLaLOSGZ4sfRsICG65SzPbzI';

const DISCORD_CLIENT_ID = '1186697433674166293';

@Module({
  imports: [
    NecordModule.forRoot({
      token: DISCORD_TOKEN,
      intents: [IntentsBitField.Flags.Guilds],
    }),
  ],
  providers: [MyDiscordService, DiscordPingService],
})
export class MyDiscordModule {}
