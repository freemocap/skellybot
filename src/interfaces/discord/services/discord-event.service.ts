import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { Client } from 'discord.js';
import { DiscordThreadListenerService } from './discord-thread-listener.service';

@Injectable()
export class DiscordEventService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscordEventService.name);

  public constructor(
    private readonly client: Client,
    private readonly _logger: Logger,
    private readonly _threadListenersService: DiscordThreadListenerService,
  ) {}

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}!`);
    await this._threadListenersService.start();
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  onModuleDestroy(): any {
    this._logger.log('Shutting down Discord chatbot');
    this._threadListenersService.stop();
  }
}
