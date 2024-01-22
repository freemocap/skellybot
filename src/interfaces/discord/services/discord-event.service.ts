import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { Client } from 'discord.js';
import { DiscordListenersService } from './discord-listeners.service';

@Injectable()
export class DiscordEventService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscordEventService.name);

  public constructor(
    private readonly client: Client,
    private readonly _logger: Logger,
    private readonly _discordListenersService: DiscordListenersService,
  ) {}

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}!`);
    await this._discordListenersService.start();
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  onModuleDestroy(): any {
    this._logger.log('Shutting down Discord bot');
    this._discordListenersService.stop();
  }
}
