import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  TargetMessage,
} from 'necord';
import { Message } from 'discord.js';
import { DiscordMessageService } from '../../services/discord-message.service';
import { DiscordOnMessageService } from '../../services/events/discord-on-message.service';
import { DiscordThreadService } from '../../services/discord-thread.service';
import { StartingTextDto } from './starting-text.dto';

@Injectable()
export class DiscordChatMessageCommand {
  private readonly logger = new Logger(DiscordChatMessageCommand.name);

  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _onMessageService: DiscordOnMessageService,
    private readonly _threadService: DiscordThreadService,
  ) {}

  @MessageCommand({
    name: 'Open `/chat` thread',
  })
  public async onMessageContextChatCommand(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
    @Options({ required: false }) startingText?: StartingTextDto,
  ) {
    await interaction.deferReply();

    try {
      const { humanInputText, attachmentText } =
        await this._messageService.extractMessageContent(message);

      this.logger.log(
        `Received 'message context menu' command for Message: ${message.id} in channel: name= ${interaction.channel.name}, id=${message.channel.id} `,
      );
      const thread = await this._threadService.createNewThread(
        startingText.text + humanInputText + attachmentText,
        interaction,
      );

      const firstThreadMessage = await thread.send(
        `Starting new chat with initial message:\n\n> ${
          humanInputText + attachmentText
        }`,
      );

      await this._onMessageService.addActiveChat(firstThreadMessage);
      await this._messageService.respondToMessage(
        firstThreadMessage,
        thread,
        interaction.user.id,
        true,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
    }
  }
}
