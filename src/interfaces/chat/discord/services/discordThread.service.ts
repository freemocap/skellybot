import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DEV_GUILDS } from '../../../../shared/config/constants';
import { TextDto } from '../dto/textDto';
import { ChatbotService } from '../../../../shared/chatbot-core/chatbot.service';
import { Chatbot } from '../../../../shared/chatbot-core/chatbot.dto';

@Injectable()
export class DiscordThreadService {
  constructor(
    private readonly _logger: Logger,
    private readonly _chatbotService: ChatbotService,
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

    // @ts-ignore
    const thread = await interaction.channel.threads.create({
      name: text || 'new thread',
      autoArchiveDuration: 60,
      reason: 'wow this is a thread',
    });

    await this._chatbotService.createChatbot(thread.id);

    interaction.client.on('messageCreate', async (message) => {
      this._logger.log(`Recieved message ${message.content}`);
      if (message.author.bot) {
        return;
      }

      const aiResponse = await this._chatbotService.generateAiResponse(
        thread.id,
        message.content,
        // @ts-ignore
        { topic: interaction.channel.topic },
      );
      await message.reply(aiResponse);
    });

    const initialMessage = await thread.send(startingText.text);
    const aiResponse = await this._chatbotService.generateAiResponse(
      thread.id,
      startingText.text,
      // @ts-ignore
      { topic: interaction.channel.topic },
    );
    await initialMessage.reply(aiResponse);
    await interaction.editReply('Thread Created!');
  }
}
