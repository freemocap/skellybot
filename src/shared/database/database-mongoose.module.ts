import { MongoConfigService } from './mongo-config.service';
import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConnectionService } from './database-connection.service';
import { GcpModule } from '../gcp/gcp.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [GcpModule],
      useClass: MongoConfigService,
    }),
    GcpModule,
  ],
  providers: [Logger, DatabaseConnectionService, MongoConfigService],
  exports: [],
})
export class DatabaseMongooseModule {}
