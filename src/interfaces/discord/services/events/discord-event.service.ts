import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { DiscordOnMessageService } from './discord-on-message.service';
import { RateLimitData } from 'discord.js';

@Injectable()
export class DiscordEventService {
  private readonly logger = new Logger(DiscordEventService.name);

  public constructor(
    private readonly _onMessageService: DiscordOnMessageService,
  ) {}

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}!`);
    client.on('rateLimit', (rateLimitInfo: RateLimitData) => {
      this.logger.warn(
        `Rate limit hit: ${rateLimitInfo.method} ${rateLimitInfo.route}`,
      );
    });
  }

  @On('warn')
  public async onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public async onMessageCreate(
    @Context() [message]: ContextOf<'messageCreate'>,
  ) {
    await this._onMessageService.handleMessageCreation(message);
  }
}
