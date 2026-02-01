import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { Message, ThreadChannel, TextBasedChannel } from 'discord.js';
import { OpenClawClientService } from '../../../core/openclaw/openclaw-client.service';
import { DiscordAgentPermissionService } from './discord-agent-permission.service';
import { DiscordMessageService } from './discord-message.service';

interface AgentThreadMetadata {
  threadId: string;
  ownerId: string;
  sessionKey: string;
  createdAt: Date;
  initialUserPermissions: string; // Stored for logging
}

@Injectable()
export class DiscordAgentThreadService implements OnModuleInit {
  private readonly logger = new Logger(DiscordAgentThreadService.name);
  private activeThreads = new Map<string, AgentThreadMetadata>();

  constructor(
    private readonly _openclawClient: OpenClawClientService,
    private readonly _permissionService: DiscordAgentPermissionService,
    private readonly _messageService: DiscordMessageService,
  ) {}

  onModuleInit() {
    this.logger.log('Agent thread service initialized');
  }

  /**
   * Register a new agent thread
   */
  registerThread(threadId: string, ownerId: string, userPermissions: string): string {
    const sessionKey = `discord:agent:${threadId}`;
    
    this.activeThreads.set(threadId, {
      threadId,
      ownerId,
      sessionKey,
      createdAt: new Date(),
      initialUserPermissions: userPermissions,
    });

    this.logger.log(`Registered agent thread ${threadId} for user ${ownerId} (${userPermissions})`);
    return sessionKey;
  }

  /**
   * Check if a thread is an agent thread
   */
  isAgentThread(threadId: string): boolean {
    return this.activeThreads.has(threadId);
  }

  /**
   * Get thread metadata
   */
  getThreadMetadata(threadId: string): AgentThreadMetadata | undefined {
    return this.activeThreads.get(threadId);
  }

  /**
   * Listen for messages in agent threads
   */
  @On('messageCreate')
  async onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if this is in an agent thread
    if (!message.channel.isThread()) return;
    
    const thread = message.channel as ThreadChannel;
    const metadata = this.getThreadMetadata(thread.id);
    
    if (!metadata) return; // Not an agent thread

    this.logger.log(
      `Message in agent thread ${thread.id} from user ${message.author.tag}`,
    );

    try {
      // Check permissions
      const member = message.member;
      const permCheck = await this._permissionService.canInteractWithThread(
        message.author,
        metadata.ownerId,
        member ?? undefined,
      );

      if (!permCheck.allowed) {
        this.logger.warn(
          `User ${message.author.tag} denied access to agent thread: ${permCheck.reason}`,
        );
        await message.reply(
          `⛔ ${permCheck.reason}\n\nOnly moderators or the thread owner can interact with agent threads.`,
        );
        return;
      }

      // Extract message content
      const { humanInputText, attachmentText, imageURLs } =
        await this._messageService.extractMessageContent(message);

      const fullMessage = humanInputText + attachmentText;

      if (!fullMessage.trim()) {
        return; // Empty message
      }

      // Get user permission level
      const userPermissions = this._permissionService.getUserPermissionLevel(
        message.author,
        member ?? undefined,
      );

      // Show typing indicator
      await thread.sendTyping();

      // Send to OpenClaw with permission context
      await this.handleThreadMessage(
        thread,
        metadata.sessionKey,
        fullMessage,
        message.author.id,
        userPermissions,
      );

    } catch (error) {
      this.logger.error(`Error handling agent thread message: ${error}`);
      await thread.send(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Handle a message in an agent thread
   */
  private async handleThreadMessage(
    thread: ThreadChannel,
    sessionKey: string,
    userMessage: string,
    userId: string,
    userPermissions: any,
  ): Promise<void> {
    try {
      let responseText = '';
      let lastUpdateTime = Date.now();
      let responseMessage: Message | null = null;

      // Subscribe to OpenClaw stream
      const unsubscribe = this._openclawClient.onAgentStream(
        sessionKey,
        async (text: string, phase?: string) => {
          responseText = text;

          const now = Date.now();
          if (now - lastUpdateTime > 1000) {
            lastUpdateTime = now;

            if (!responseMessage) {
              responseMessage = await thread.send(responseText || '⏳ Thinking...');
            } else {
              try {
                if (responseText.length > 1900) {
                  await responseMessage.edit(responseText.slice(0, 1900) + '...');
                } else {
                  await responseMessage.edit(responseText);
                }
              } catch (error) {
                this.logger.error(`Failed to edit message: ${error}`);
              }
            }
          }

          if (phase === 'end') {
            unsubscribe();
            
            if (!responseMessage) {
              responseMessage = await thread.send(responseText || '✅ Done');
            } else {
              await this._messageService.sendChunkedMessage(thread as TextBasedChannel, responseText);
              await responseMessage.delete();
            }
          }
        },
      );

      // Build permission context for AI
      const permissionContext = this.buildPermissionContext(userPermissions);

      // Send to OpenClaw with permission metadata prepended
      const messageWithContext = `${permissionContext}\n\nUser message: ${userMessage}`;

      await this._openclawClient.sendMessage({
        sessionKey,
        message: messageWithContext,
        agentId: 'main',
      });

    } catch (error) {
      this.logger.error(`Error in handleThreadMessage: ${error}`);
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

  /**
   * Clean up old threads (optional cleanup task)
   */
  cleanupOldThreads(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [threadId, metadata] of this.activeThreads.entries()) {
      if (metadata.createdAt < cutoff) {
        this.activeThreads.delete(threadId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old agent threads`);
    }
  }
}
