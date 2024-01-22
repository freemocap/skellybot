import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordTextDto } from '../../dto/discord-text.dto';
import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PrivateThreadChannel,
  PublicThreadChannel,
  TextChannel,
  User,
  userMention,
} from 'discord.js';
import { ChatbotManagerService } from '../../../../core/chatbot/chatbot-manager.service';
import { UsersService } from '../../../../core/database/collections/users/users.service';
import { AiChatsService } from '../../../../core/database/collections/ai-chats/ai-chats.service';
import { DiscordContextService } from './discord-context.service';
import { DiscordThreadListenerService } from '../discord-thread-listener.service';
import { DiscordMessageService } from './discord-message.service';

@Injectable()
export class DiscordThreadService {
  constructor(
    private readonly _aiChatsService: AiChatsService,
    private readonly _usersService: UsersService,
    private readonly _contextService: DiscordContextService,
    private readonly _logger: Logger,
    private readonly _botService: ChatbotManagerService,
    private readonly _threadListenerService: DiscordThreadListenerService,
    private readonly _messageService: DiscordMessageService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the chatbot.',
  })
  public async onThreadCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: DiscordTextDto,
  ) {
    await interaction.deferReply();
    if (!startingText.text) {
      startingText.text = '.';
    }

    this._logger.log(
      `Creating thread with starting text:'${startingText.text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
    );
    const channel = interaction.channel as TextChannel;
    const thread = await this._createNewThread(startingText, interaction);

    const firstThreadMessage = await thread.send(
      `Starting new chat with initial message:\n\n> ${startingText.text}`,
    );
    await this._createAiChat(
      firstThreadMessage,
      channel,
      thread,
      interaction.user,
    );

    await this._threadListenerService.startThreadListener(thread.id);
    await this._messageService.respondToMessage(firstThreadMessage, true);
  }

  private async _createAiChat(
    firstThreadMessage,
    channel: TextChannel,
    thread: PublicThreadChannel<boolean> | PrivateThreadChannel,
    user: User,
  ) {
    const contextRoute =
      this._contextService.getContextRoute(firstThreadMessage);
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

    const userDocument = await this._usersService.getOrCreateUser({
      identifiers: {
        discord: {
          id: user.id,
          username: user.username,
        },
      },
    });

    const aiChat = await this._aiChatsService.createAiChat({
      ownerUser: userDocument,
      contextRoute,
      contextInstructions,
      aiChatId: thread.id,
      couplets: [],
    });
    this._logger.log(`Created aiChat: ${JSON.stringify(aiChat)}`);
  }

  private async _createNewThread(
    startingText: DiscordTextDto,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    const maxThreadNameLength = 100; // Discord's maximum thread name length
    let threadName = startingText.text;
    if (threadName.length > maxThreadNameLength) {
      threadName = threadName.substring(0, maxThreadNameLength);
    }
    const threadTitleEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setAuthor({
        name: `Thread created by ${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
      })
      .setTimestamp()
      .addFields({
        name: '`skellybot` source code:',
        value: 'https://github.com/freemocap/skellybot',
      });

    const replyMessage = await interaction.editReply({
      content: `Thread Created for user: ${userMention(
        interaction.user.id,
      )} with starting text:\n\n> ${startingText.text}`,
      embeds: [threadTitleEmbed],
      attachments: [],
    });
    const thread = await replyMessage.startThread({
      name: threadName,
    });
    return thread;
  }
}
