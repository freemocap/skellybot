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
      
      // Get user permission level (for AI tool restrictions)
      const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : undefined;
      const userPermissions = this._permissionService.getUserPermissionLevel(interaction.user, member);
      
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
      const permissionSummary = userPermissions.isAdmin ? 'Admin' : 
                               userPermissions.isModerator ? 'Moderator' : 
                               'Regular User';
      this._agentThreadService.registerThread(thread.id, interaction.user.id, permissionSummary);

      // Build capability message based on permissions
      let capabilityMessage = '✨ OpenClaw Agent Chat Created\n\n';
      
      if (userPermissions.canUseFileTools) {
        capabilityMessage += '✅ Full Tool Access (Admin/Mod):\n';
        capabilityMessage += '- 🔍 Web search\n';
        capabilityMessage += '- 📄 PDF reading\n';
        capabilityMessage += '- 🌐 Web scraping\n';
        capabilityMessage += '- 💻 Code execution\n';
        capabilityMessage += '- 📝 File operations\n';
        capabilityMessage += '- 🖼️ Image analysis\n';
      } else {
        capabilityMessage += '📖 Read-Only Tool Access:\n';
        capabilityMessage += '- 🔍 Web search\n';
        capabilityMessage += '- 📄 PDF reading\n';
        capabilityMessage += '- 🌐 Web scraping\n';
        capabilityMessage += '- 🖼️ Image analysis\n';
        capabilityMessage += '- ⛔ File operations: Admin only\n';
        capabilityMessage += '- ⛔ Code execution: Admin only\n';
      }
      
      capabilityMessage += `\nUser: ${interaction.user.tag} (${permissionSummary})\n`;
      capabilityMessage += `\ninitial message: ${agentInitCommand.text}`;

      const firstThreadMessage = await thread.send(`\`\`\`${capabilityMessage}\`\`\``);


      // Send message to OpenClaw and stream response
      await this.handleAgentResponse(
        thread,
        firstThreadMessage,
        agentInitCommand.text,
        interaction.user.id,
        userPermissions,
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
      // Get user permission level
      const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : undefined;
      const userPermissions = this._permissionService.getUserPermissionLevel(interaction.user, member);

      const { humanInputText, attachmentText } =
        await this._messageService.extractMessageContent(message);

      this.logger.log(
        `Received 'message context menu' for /agent: Message ${message.id} in channel: ${interaction.channel.name}`,
      );
      
      const thread = await this._threadService.createNewThread(
        humanInputText + attachmentText,
        interaction,
      );

      // Register thread
      const permissionSummary = userPermissions.isAdmin ? 'Admin' : 
                               userPermissions.isModerator ? 'Moderator' : 
                               'Regular User';
      this._agentThreadService.registerThread(thread.id, interaction.user.id, permissionSummary);

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
        userPermissions,
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
    userPermissions: any,
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

      // Build permission context for AI
      const permissionContext = this.buildPermissionContext(userPermissions);

      // Send message to OpenClaw with permission metadata
      const messageWithContext = `${permissionContext}\n\nUser message: ${userMessage}`;

      await this._openclawClient.sendMessage({
        sessionKey,
        message: messageWithContext,
        agentId: 'main',
      });

    } catch (error) {
      this.logger.error(`Error in handleAgentResponse: ${error}`);
      await thread.send(`❌ Error communicating with OpenClaw: ${error.message}`);
    }
  }

  /**
   * Build permission context string for AI
   */
  private buildPermissionContext(permissions: any): string {
    const lines = [
      '[SYSTEM: User Permission Context]',
    ];

    if (permissions.isAdmin) {
      lines.push('User is ADMIN - Full tool access granted');
    } else if (permissions.isModerator) {
      lines.push('User is MODERATOR - Full tool access granted');
    } else {
      lines.push('User is REGULAR USER - Tool restrictions apply:');
      lines.push('- ⛔ NO file write/edit operations (read-only)');
      lines.push('- ⛔ NO code execution or installs');
      lines.push('- ✅ Web search, fetch, and read operations OK');
      lines.push('- ✅ Analysis and information tasks OK');
    }

    lines.push(`User: ${permissions.displayName}`);
    lines.push('[END SYSTEM CONTEXT]');

    return lines.join('\n');
  }
}
