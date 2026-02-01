// src/interfaces/discord/commands/discord-agent.command.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
  TargetMessage,
} from 'necord';
import { DiscordMessageService } from '../services/discord-message.service';
import { DiscordThreadService } from '../services/discord-thread.service';
import { OpenClawClientService } from '../../../core/openclaw/openclaw-client.service';
import { DiscordAgentPermissionService } from '../services/discord-agent-permission.service';
import { DiscordAgentThreadService } from '../services/discord-agent-thread.service';
import { Message, TextChannel, ThreadChannel } from 'discord.js';

export class InitialAgentDto {
  @StringOption({
    name: 'text',
    description: 'Starting text for the agent chat',
    required: false,
  })
  text: string;
}

@Injectable()
export class DiscordAgentCommand {
  private readonly logger = new Logger(DiscordAgentCommand.name);

  constructor(
    private readonly _messageService: DiscordMessageService,
    private readonly _threadService: DiscordThreadService,
    private readonly _openclawClient: OpenClawClientService,
    private readonly _permissionService: DiscordAgentPermissionService,
    private readonly _agentThreadService: DiscordAgentThreadService,
  ) {}

  @SlashCommand({
    name: 'agent',
    description:
      'Opens a thread with OpenClaw AI (tools enabled: web search, PDFs, etc)',
  })
  public async onSlashAgentCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options({ required: false }) agentInitCommand?: InitialAgentDto,
  ) {
    try {
      await interaction.deferReply();
      
      // Check permissions
      const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : undefined;
      const permCheck = await this._permissionService.canUseAgent(interaction.user, member);
      
      if (!permCheck.allowed) {
        this.logger.warn(`User ${interaction.user.tag} denied /agent access: ${permCheck.reason}`);
        await interaction.editReply(`⛔ ${permCheck.reason}`);
        return;
      }
      
      if (!agentInitCommand?.text) {
        agentInitCommand = { text: 'Hello! What can you help me with?' };
      }

      this.logger.log(
        `Received '/agent' command with starting text:'${agentInitCommand.text}' in channel: name=${interaction.channel.name}, id=${interaction.channel.id}`,
      );

      // Create thread
      const thread = await this._threadService.createNewThread(
        agentInitCommand.text,
        interaction,
      );

      // Register thread with agent service
      this._agentThreadService.registerThread(thread.id, interaction.user.id);

      const firstThreadMessage = await thread.send(
        `\`\`\`✨ OpenClaw Agent Chat Created by ${interaction.user.tag}\n\nTools enabled:\n- 🔍 Web search\n- 📄 PDF reading\n- 🌐 Web scraping\n- 💻 Code execution\n- 🖼️ Image analysis\n- And more!\n\n🔒 Only moderators or ${interaction.user.tag} can interact with this thread.\n\ninitial message: ${agentInitCommand.text}\n\`\`\``,
      );

      // Send message to OpenClaw and stream response
      await this.handleAgentResponse(
        thread,
        firstThreadMessage,
        agentInitCommand.text,
        interaction.user.id,
      );
      
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
      await interaction.editReply(`Error opening agent thread: ${error}`);
    }
  }

  @MessageCommand({
    name: 'Open `/agent` thread',
  })
  public async onMessageContextAgentCommand(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    await interaction.deferReply();
    try {
      const { humanInputText, attachmentText } =
        await this._messageService.extractMessageContent(message);

      this.logger.log(
        `Received 'message context menu' for /agent: Message ${message.id} in channel: ${interaction.channel.name}`,
      );
      
      const thread = await this._threadService.createNewThread(
        humanInputText + attachmentText,
        interaction,
      );

      const firstMessageContent = `✨ Starting OpenClaw agent chat with:\n\n> ${
        humanInputText + attachmentText
      }`;

      const firstThreadMessages = await this._messageService.sendChunkedMessage(
        thread,
        firstMessageContent,
      );

      const firstThreadMessage = firstThreadMessages[0];

      await this.handleAgentResponse(
        thread,
        firstThreadMessage,
        humanInputText + attachmentText,
        interaction.user.id,
      );
      
    } catch (error) {
      this.logger.error(`Caught error: ${error}`);
      await interaction.editReply(`Error opening agent thread: ${error}`);
    }
  }

  /**
   * Handle OpenClaw agent response with streaming
   */
  private async handleAgentResponse(
    thread: ThreadChannel,
    triggerMessage: Message,
    userMessage: string,
    userId: string,
  ): Promise<void> {
    try {
      await thread.sendTyping();

      // Use thread ID as session key for isolation
      const sessionKey = `discord:agent:${thread.id}`;

      // Start accumulating response
      let responseText = '';
      let lastUpdateTime = Date.now();
      let responseMessage: Message | null = null;

      // Subscribe to stream events
      const unsubscribe = this._openclawClient.onAgentStream(
        sessionKey,
        async (text: string, phase?: string) => {
          responseText = text;

          // Update message periodically (avoid rate limits)
          const now = Date.now();
          if (now - lastUpdateTime > 1000) { // Update every second
            lastUpdateTime = now;

            if (!responseMessage) {
              // Create initial message
              responseMessage = await thread.send(responseText || '⏳ Thinking...');
            } else {
              // Update existing message
              try {
                // Check if message is too long for Discord (2000 char limit)
                if (responseText.length > 1900) {
                  // Send chunked
                  await responseMessage.edit(responseText.slice(0, 1900) + '...');
                } else {
                  await responseMessage.edit(responseText);
                }
              } catch (error) {
                this.logger.error(`Failed to edit message: ${error}`);
              }
            }
          }

          // If phase is 'end', do final update
          if (phase === 'end') {
            unsubscribe();
            
            if (!responseMessage) {
              responseMessage = await thread.send(responseText || '✅ Done');
            } else {
              // Final update with full text (chunked if needed)
              await this._messageService.sendChunkedMessage(thread, responseText);
              await responseMessage.delete();
            }
          }
        },
      );

      // Send message to OpenClaw
      await this._openclawClient.sendMessage({
        sessionKey,
        message: userMessage,
        agentId: 'main',
      });

    } catch (error) {
      this.logger.error(`Error in handleAgentResponse: ${error}`);
      await thread.send(`❌ Error communicating with OpenClaw: ${error.message}`);
    }
  }
}
