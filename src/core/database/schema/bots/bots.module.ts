import { Logger, Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Bot, BotSchema } from './bot.schema';
import { LangchainModule } from '../../../ai/langchain/langchain.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bot.name, schema: BotSchema }]),
    LangchainModule,
  ],
  providers: [BotsService, Logger],
  exports: [BotsService],
})
export class BotsModule {}
