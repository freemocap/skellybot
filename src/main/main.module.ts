import { Module } from '@nestjs/common';
// import { SlackModule } from '../interfaces/slack/slack.module';
import { MainController } from './main.controller';
import { ConfigModule } from '@nestjs/config';
import { DiscordModule } from '../interfaces/discord/discord.module';
import { DatabaseConnectionService } from '../core/database/database-connection.service';
import { DatabaseModule } from '../core/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '.env.slack',
        '.env.discord',
        '.env.mongo',
        '.env.openai',
      ],
    }),
    DatabaseModule,
    // SlackModule,
    DiscordModule,
  ],
  controllers: [MainController],
  providers: [DatabaseConnectionService],
})
export class MainModule {}
