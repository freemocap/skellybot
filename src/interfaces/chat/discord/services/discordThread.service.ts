import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILDS } from '../../../../shared/config/constants';
import { TextDto } from '../dto/textDto';
import { ChatbotService } from '../../../../shared/chatbot-core/chatbot.service';
import {
  ChatInputCommandInteraction,
  Client,
  Message,
  TextChannel,
  ThreadChannel,
} from 'discord.js';

@Injectable()
export class DiscordThreadService implements OnModuleDestroy {
  constructor(
    private readonly _logger: Logger,
    private readonly _chatbotService: ChatbotService,
    private readonly _client: Client,
  ) {}

  @SlashCommand({
    name: 'skelly',
    description:
      'Opens a thread at this location and sets up a conversation with with the bot.',
    guilds: DEV_GUILDS,
  })
  public async onThreadCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() startingText: TextDto,
  ) {
    await interaction.deferReply();
    const { text } = startingText;
    this._logger.log(
      `Creating thread with starting text:'${text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
    );
    const channel = interaction.channel as TextChannel;
    const thread = await channel.threads.create({
      name: text || 'new thread',
      autoArchiveDuration: 60,
      reason: 'wow this is a thread',
    });

    await this._chatbotService.createChatbot(thread.id);

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
    const t = { ...thread };
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
    const initialMessage = await thread.send(`The Human said: \n ${inputText}`);
    await interaction.editReply('Thread Created!');
    await this._handleStream(channel, thread, inputText, initialMessage);
  }

  private async _handleStream(
    channel: TextChannel,
    thread: ThreadChannel,
    inputText: string,
    message: Message<boolean>,
  ) {
    const tokenStream = this._chatbotService.streamResponse(
      thread.id,
      inputText,
      {
        topic: channel.topic,
      },
    );
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
