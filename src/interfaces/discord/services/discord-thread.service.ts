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
import { DiscordContextRouteFactory } from '../../../core/database/collections/ai-chats/context-route.provider';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { CoupletsService } from '../../../core/database/collections/couplets/couplets.service';
import { MessagesService } from '../../../core/database/collections/messages/messages.service';

@Injectable()
export class DiscordThreadService implements OnModuleDestroy {
  constructor(
    private readonly _aiChatsService: AiChatsService,
    private readonly _usersService: UsersService,
    private readonly _coupletService: CoupletsService,
    private readonly _messageService: MessagesService,
    private readonly _logger: Logger,
    private readonly _botService: BotService,
    private readonly _client: Client,
  ) {}

  @SlashCommand({
    name: 'skelly',
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

    const contextRoute = this._getContextRoute(channel, thread);
    const contextInstructions = this._getContextInstructions(channel);
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

  private _getContextRoute(
    channel: TextChannel,
    thread: ThreadChannel<boolean>,
  ) {
    return DiscordContextRouteFactory.create(
      false,
      {
        type: 'channel',
        contextId: channel.id,
        contextName: channel.name,
      },
      {
        type: 'server',
        contextId: channel.guild.id,
        contextName: channel.guild.name,
      },
      {
        type: 'category',
        contextId: channel.parentId,
        contextName: channel.parent?.name,
      },
      {
        type: 'thread',
        contextId: thread.id,
        contextName: thread.name,
      },
    );
  }

  private _getContextInstructions(channel: TextChannel) {
    const channelInstructions = channel.topic || '';
    const categoryInstructions = ''; // TODO: get category instructions from category-level `bot-config`  channel
    const serverInstructions = ''; // TODO: get server instructions from server-level `bot-config` channel
    return [serverInstructions, categoryInstructions, channelInstructions].join(
      '\n',
    );
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
    const contextRoute = this._getContextRoute(channel, thread);
    this._logger.debug(`Final thingy`, final);
    const humanMessageForDb = await this._messageService.createMessage({
      contextRoute,
      messageId: discordMessage.id,
      speakerType: 'human',
      interfaceSource: 'discord',
      content: discordMessage.content,
      messageSentTimestamp: discordMessage.createdAt,
      metadata: {
        jump_url: discordMessage.url,
        ...JSON.parse(JSON.stringify(discordMessage)),
      },
    });

    const aiMessageForDb = await this._messageService.createMessage({
      contextRoute,
      messageId: replyMessage.id,
      speakerType: 'ai',
      interfaceSource: 'discord',
      content: replyMessage.content,
      messageSentTimestamp: replyMessage.createdAt,
      metadata: {
        jump_url: replyMessage.url,
        ...JSON.parse(JSON.stringify(replyMessage)),
      },
    });

    const couplet = await this._coupletService.createCouplet({
      contextRoute,
      humanMessage: humanMessageForDb,
      aiResponse: aiMessageForDb,
    });

    await this._aiChatsService.addCouplets(thread.id, [couplet]);
  }
}
