import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { DiscordOnMessageService } from './discord-on-message.service';
import { RateLimitData } from 'discord.js';

@Injectable()
export class DiscordStartUpService {
  private readonly logger = new Logger(DiscordStartUpService.name);

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
    this.logger.log(`Logged in as ${client.user.tag}!`);
    this._logRegisteredCommands(client);
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

  private _logRegisteredCommands(client: ContextOf<'ready'>[0]) {
    client.application.commands
      .fetch()
      .then((commands) => {
        this.logger.log(
          `Registered commands: "${commands
            .map((cmd) => cmd.name)
            .join('", "')}"`,
        );
      })
      .catch((error) => {
        this.logger.error('Error fetching registered commands:', error);
      });
  }
}
