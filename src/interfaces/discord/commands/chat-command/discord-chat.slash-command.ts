import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
} from 'necord';
import { DiscordMessageService } from '../../services/discord-message.service';
import { DiscordOnMessageService } from '../../services/events/discord-on-message.service';
import { DiscordThreadService } from '../../services/discord-thread.service';

export class StartingTextDto {
  @StringOption({
    name: 'text',
    description: 'Starting text for the chat',
    required: false,
  })
  text: string;
}

@Injectable()
export class DiscordSlashChatCommand {
  private readonly logger = new Logger(DiscordSlashChatCommand.name);

  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _onMessageService: DiscordOnMessageService,
    private readonly _threadService: DiscordThreadService,
  ) {}

  @SlashCommand({
    name: 'chat',
    description:
      'Opens a thread at this location and sets up a aiChat with with the chatbot.',
  })
  public async onSlashChatCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) startingText?: StartingTextDto,
  ) {
    try {
      await interaction.deferReply();
      if (!startingText.text) {
        startingText.text = '.';
      }

      this.logger.log(
        `Recieved '/chat' command with starting text:'${startingText.text}' in channel: name= ${interaction.channel.name}, id=${interaction.channel.id} `,
      );
      const thread = await this._threadService.createNewThread(
        startingText.text,
        interaction,
      );

      const firstThreadMessage = await thread.send(
        `Starting new chat with initial message:\n\n> ${startingText.text}`,
      );

      await this._onMessageService.addActiveChat(firstThreadMessage);
      await this._messageService.respondToMessage(
        firstThreadMessage,
        firstThreadMessage,
        interaction.user.id,
        true,
      );
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
    }
  }
}
