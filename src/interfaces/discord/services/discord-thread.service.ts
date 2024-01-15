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
import { BotService } from '../../../core/bot/bot.service';
import { UsersService } from '../../../core/database/collections/users/users.service';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { DiscordContextService } from './discord-context.service';
import { DiscordPersistenceService } from './discord-persistence.service';

@Injectable()
export class DiscordThreadService implements OnModuleDestroy {
  constructor(
    private readonly _aiChatsService: AiChatsService,
    private readonly _usersService: UsersService,
    private readonly _contextService: DiscordContextService,
    private readonly _logger: Logger,
    private readonly _botService: BotService,
    private readonly _client: Client,
    private readonly _persistenceService: DiscordPersistenceService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the bot.',
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

    const contextRoute = this._contextService.getContextRoute(channel, thread);
    const contextInstructions =
      await this._contextService.getContextInstructions(channel);
    this._logger.log(
      `Creating bot with contextInstructions: \n ''' \n ${contextInstructions}\n '''`,
    );

    // await this._botService.createChatbot(thread.id);

    await this._botService.createBot(
      thread.id,
      'gpt-4-1106-preview',
      contextInstructions || '',
    );

    const user = await this._usersService.getOrCreateUser({
      identifiers: {
        discord: {
          id: interaction.user.id,
          username: interaction.user.username,
        },
      },
    });

    await this._aiChatsService.createAiChat({
      ownerUser: user,
      contextRoute,
      aiChatId: thread.id,
      couplets: [],
    });
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
    const handleMessageCreation = async (discordMessage: Message) => {
      if (discordMessage.author.bot) {
        return;
      }
      if (discordMessage.channelId !== thread.id) {
        return;
      }

      this._logger.log(`Received message ${discordMessage.content}`);
      await this._handleStream(
        channel,
        thread,
        discordMessage.content,
        discordMessage,
      );
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
    discordMessage: Message<boolean>,
  ) {
    thread.sendTyping();

    const tokenStream = this._botService.streamResponse(thread.id, inputText, {
      topic: channel.topic,
    });

    let replyMessage: Message<boolean> = undefined;
    let final = '';
    for await (const current of tokenStream) {
      const { theChunk, didResetOccur } = current;

      if (!replyMessage) {
        replyMessage = await discordMessage.reply(theChunk);
        continue;
      }

      if (didResetOccur) {
        replyMessage = await discordMessage.reply(theChunk);
        continue;
      }

      await replyMessage.edit(theChunk);
      final = current.data;
    }
    const contextRoute = this._contextService.getContextRoute(channel, thread);
    this._logger.debug(`Final thingy`, final);
    this._persistenceService.persistInteraction(
      thread.id,
      contextRoute,
      discordMessage,
      replyMessage,
    );
  }
}
