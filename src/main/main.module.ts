import { Module } from '@nestjs/common';
import { SlackInterfaceModule } from '../interfaces/chat/slack/slackInterface.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';
import { DiscordInterfaceModule } from '../interfaces/chat/discord/discordInterfaceModule';
import { DatabaseMongooseModule } from '../shared/database/database-mongoose.module';

@Module({
  imports: [
    DiscordInterfaceModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.slack', '.env.discord', '.env.mongo'],
    }),
    SlackInterfaceModule,
    DatabaseMongooseModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
