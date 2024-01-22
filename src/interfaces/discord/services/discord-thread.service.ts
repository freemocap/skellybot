import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordTextDto } from '../dto/discord-text.dto';
import { Client, EmbedBuilder, TextChannel, userMention } from 'discord.js';
import { BotService } from '../../../core/bot/bot.service';
import { UsersService } from '../../../core/database/collections/users/users.service';
import { AiChatsService } from '../../../core/database/collections/ai-chats/ai-chats.service';
import { DiscordContextService } from './discord-context.service';
import { DiscordMessageService } from './discord-message.service';

@Injectable()
export class DiscordThreadService implements OnModuleDestroy {
  constructor(
    private readonly _aiChatsService: AiChatsService,
    private readonly _usersService: UsersService,
    private readonly _contextService: DiscordContextService,
    private readonly _logger: Logger,
    private readonly _botService: BotService,
    private readonly _client: Client,
    private readonly _messageService: DiscordMessageService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the bot.',
  })
  public async onThreadCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: DiscordTextDto,
  ) {
    await interaction.deferReply();
    const { text } = startingText || { text: '.' };
    this._logger.log(
      `Creating thread with starting text:'${text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
    );
    const channel = interaction.channel as TextChannel;
    const maxThreadNameLength = 100; // Discord's maximum thread name length
    let threadName = text || 'new thread';
    if (threadName.length > maxThreadNameLength) {
      threadName = threadName.substring(0, maxThreadNameLength);
    }
    const threadTitleEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(threadName)
      .setURL('https://github.com/freemocap/skellybot')
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.avatarURL(),
      });

    // .setDescription('Some description here')
    // .setThumbnail('https://i.imgur.com/AfFp7pu.png')
    // .addFields(
    //   { name: 'Regular field title', value: 'Some value here' },
    //   { name: '\u200B', value: '\u200B' },
    //   { name: 'Inline field title', value: 'Some value here', inline: true },
    //   { name: 'Inline field title', value: 'Some value here', inline: true },
    // )
    // .addFields({
    //   name: 'Inline field title',
    //   value: 'Some value here',
    //   inline: true,
    // })
    // .setImage('https://i.imgur.com/AfFp7pu.png')
    // .setTimestamp()
    // .setFooter({
    //   text: 'Some footer text here',
    //   iconURL: 'https://i.imgur.com/AfFp7pu.png',
    // });

    const replyMessage = await interaction.editReply({
      content: `Thread Created for user: ${userMention(interaction.user.id)}`,
      embeds: [threadTitleEmbed],
      attachments: [],
    });
    const thread = await replyMessage.startThread({
      name: threadName,
    });

    const contextRoute = this._contextService.getContextRoute(channel, thread);
    const contextInstructions =
      await this._contextService.getContextInstructions(channel);
    this._logger.log(
      `Creating bot with contextInstructions: \n ''' \n ${contextInstructions}\n '''`,
    );

    await this._botService.createBot(
      thread.id,
      'gpt-4-1106-preview',
      contextInstructions || '.',
    );

    const user = await this._usersService.getOrCreateUser({
      identifiers: {
        discord: {
          id: interaction.user.id,
          username: interaction.user.username,
        },
      },
    });

    const aiChat = await this._aiChatsService.createAiChat({
      ownerUser: user,
      contextRoute,
      aiChatId: thread.id,
      couplets: [],
    });
    this._logger.log(`Created aiChat: ${JSON.stringify(aiChat)}`);
    // await replyMessage.editReply({attachments: [aiChat]
    this._messageService.beginWatchingIncomingMessages(
      interaction,
      channel,
      thread,
    );
    await this._messageService.sendInitialReply(
      interaction,
      channel,
      thread,
      text,
    );
  }

  /**
   * When the bot application dies, we remove all listeners.
   */
  onModuleDestroy() {
    this._client.removeAllListeners();
  }
}
