import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { DiscordOnMessageService } from './discord-on-message.service';
import { Client, RateLimitData } from 'discord.js';
import { DiscordChatCommand } from '../commands/discord-chat.command';
import { DiscordModelCommand } from '../commands/discord-model.command';

@Injectable()
export class DiscordStartUpService implements OnModuleInit {
  private readonly logger = new Logger(DiscordStartUpService.name);

  public constructor(
    private readonly client: Client,
    private readonly _onMessageService: DiscordOnMessageService,
    private readonly discordChatCommand: DiscordChatCommand,
    private readonly discordModelCommand: DiscordModelCommand, // Add this line to inject the model command
  ) {}

  async onModuleInit() {
    this.logger.log('DiscordStartUpService initialized');
    this.logger.log(`DEV_GUILD_IDS: ${process.env.DEV_GUILD_IDS}`);
    // This will ensure commands are registered at startup
    await this._logRegisteredCommands();
  }

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}!`);
    client.on('rateLimit', (rateLimitInfo: RateLimitData) => {
      this.logger.warn(
        `Rate limit hit: ${rateLimitInfo.method} ${rateLimitInfo.route}`,
      );
    });
    this.logger.log(`Logged in as ${client.user.tag}!`);

    // Force refresh commands registration
    this.logger.log('Refreshing command registrations...');
    await this._logRegisteredCommands();
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

  private async _logRegisteredCommands() {
    try {
      const commands = await this.client.application?.commands.fetch();
      if (commands) {
        this.logger.log(
          `Registered commands: "${commands
            .map((cmd) => cmd.name)
            .join('", "')}"`,
        );

        // Check if model command is registered
        const modelCommand = commands.find((cmd) => cmd.name === 'model');
        if (!modelCommand) {
          this.logger.warn("'model' command is not registered with Discord!");
        } else {
          this.logger.log("'model' command is registered successfully.");
        }
      } else {
        this.logger.warn('No commands fetched from application.');
      }
    } catch (error) {
      this.logger.error(`Error fetching registered commands: ${error}`);
    }
  }
}
