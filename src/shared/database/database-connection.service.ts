import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class DatabaseConnectionService implements OnModuleInit {
  constructor(
    @InjectConnection() private connection: Connection,
    private readonly _logger: Logger,
  ) {}

  onModuleInit() {
    this.connection.on('connected', () => {
      this._logger.log('Connected to database');
    });

    this.connection.on('error', (error) => {
      this._logger.error(`Database connection error: ${error}`);
    });
  }
}
