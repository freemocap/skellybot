import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { catchError, retry, throwError, from } from 'rxjs';
import { MongoConfigService } from './mongo-config.service';

@Injectable()
export class DatabaseConnectionService implements OnModuleInit {
  private readonly maxRetries = 5;

  constructor(
    @InjectConnection() private connection: Connection,
    private readonly _logger: Logger,
    private readonly _configService: MongoConfigService,
  ) {}

  async onModuleInit() {
    this.checkConnection();
  }

  async checkConnection() {
    this.connection.on('connected', () => {
      this._logger.log('Connected to database');
    });

    this.connection.on('error', async (error) => {
      this._logger.error(`Database connection error: ${error}`);
      from(this.retryConnection())
        .pipe(retry(this.maxRetries), catchError(this.handleError))
        .subscribe();
    });
  }

  private retryConnection() {
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const uri = await this._configService.getMongoUri();
          await this.connection.openUri(uri);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 5000);
    });
  }

  private handleError(error: any) {
    this._logger.error(
      `Failed to connect to database after ${this.maxRetries} retries`,
    );
    return throwError(error);
  }
}
