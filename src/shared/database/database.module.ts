import { MongoSecretsService } from './mongo-secrets.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [MongoSecretsService],
      useFactory: async (mongoSecretsService: MongoSecretsService) => ({
        uri: await mongoSecretsService.getMongoUri(),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      }),
    }),
  ],
  providers: [],
})
export class DatabaseModule {}
