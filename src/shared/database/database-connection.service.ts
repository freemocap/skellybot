import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

@Injectable()
export class DatabaseConnectionService {
  constructor(
    @Inject(getConnectionToken())
    private readonly connection: Connection,
  ) {}

  getConnection(): Connection {
    return this.connection;
  }
}
