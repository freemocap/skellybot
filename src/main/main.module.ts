import { Module } from '@nestjs/common';
import { SlackInterfaceModule } from '../interfaces/chat/slack/slackInterface.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';
import { DiscordInterfaceModule } from '../interfaces/chat/discord/discordInterfaceModule';
import { MongoDatabaseModule } from '../shared/database/mongoDatabaseModule';

@Module({
  imports: [
    DiscordInterfaceModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.slack', '.env.discord', '.env.mongo'],
    }),
    SlackInterfaceModule,
    MongoDatabaseModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
