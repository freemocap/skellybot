import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordTextDto } from '../dto/discord-text.dto';
import {
  ChatInputCommandInteraction,
  Client,
  Message,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { UsersService } from '../../../core/database/schema/users/users.service';
import { BotsService } from '../../../core/database/schema/bots/bots.service';
import { BotDto } from '../../../core/database/schema/bots/bot.dto';

@Injectable()
export class DiscordThreadService implements OnModuleDestroy {
  constructor(
    private readonly _usersService: UsersService,
    private readonly _logger: Logger,
    private readonly _botsService: BotsService,
    private readonly _client: Client,
  ) {}

  @SlashCommand({
    name: 'skelly',
    description:
      'Opens a thread at this location and sets up a conversation with with the bot.',
  })
  public async onThreadCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() startingText: DiscordTextDto,
  ) {
    await interaction.deferReply();
    const { text } = startingText;
    this._logger.log(
      `Creating thread with starting text:'${text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
    );
    const channel = interaction.channel as TextChannel;
    const maxThreadNameLength = 100; // Discord's maximum thread name length
    let threadName = text || 'new thread';
    if (threadName.length > maxThreadNameLength) {
      threadName = threadName.substring(0, maxThreadNameLength);
    }
    const thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 60,
      reason: 'wow this is a thread',
    });

    const user = await this._usersService.getOrCreate({
      discordId: interaction.user.id,
    });
    const contextRoute = {
      interface: 'discord',
      serverId: channel.guild.id || null,
      categoryId: channel.parentId || null,
      channelId: channel.id,
      threadId: thread.id || null,
    };
    const botDto: BotDto = {
      botId: thread.id,
      ownerId: user.discordId,
      contextRoute: contextRoute,
    };

    await this._botsService.createBot(botDto);

    this._beginWatchingIncomingMessages(interaction, channel, thread);
    await this._sendInitialReply(interaction, channel, thread, text);
  }

  /**
   * When the bot application dies, we remove all listeners.
   */
  onModuleDestroy() {
    this._client.removeAllListeners();
  }

  private _beginWatchingIncomingMessages(
    interaction: ChatInputCommandInteraction,
    channel: TextChannel,
    thread: ThreadChannel,
  ) {
    const handleMessageCreation = async (message: Message) => {
      if (message.author.bot) {
        return;
      }
      if (message.channelId !== thread.id) {
        return;
      }

      this._logger.log(`Received message ${message.content}`);
      await this._handleStream(channel, thread, message.content, message);
    };

    interaction.client.on('messageCreate', handleMessageCreation);
  }

  private async _sendInitialReply(
    interaction: ChatInputCommandInteraction,
    channel: TextChannel,
    thread: ThreadChannel,
    inputText: string,
  ) {
    const initialMessage = await thread.send(inputText);
    await interaction.editReply('Thread Created!');
    await this._handleStream(channel, thread, inputText, initialMessage);
  }

  private async _handleStream(
    channel: TextChannel,
    thread: ThreadChannel,
    inputText: string,
    message: Message<boolean>,
  ) {
    const tokenStream = this._botsService.streamResponse(thread.id, inputText, {
      topic: channel.topic,
    });
    thread.sendTyping();

    let initialReply: Message<boolean> = undefined;
    let final = '';
    for await (const current of tokenStream) {
      const { theChunk, didResetOccur } = current;

      if (!initialReply) {
        initialReply = await message.reply(theChunk);
        continue;
      }

      if (didResetOccur) {
        initialReply = await message.reply(theChunk);
        continue;
      }

      await initialReply.edit(theChunk);
      final = current.data;
    }

    this._logger.debug(`Final thingy`, final);
  }
}
