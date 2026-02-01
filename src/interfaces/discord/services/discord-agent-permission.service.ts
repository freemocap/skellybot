import { Injectable, Logger } from '@nestjs/common';
import { GuildMember, PermissionsBitField, User } from 'discord.js';

export interface AgentAccessConfig {
  // Allow specific user IDs (across all servers)
  allowedUserIds?: string[];
  
  // Require mod permissions in server
  requireModPermissions?: boolean;
  
  // Require specific role names
  requiredRoleNames?: string[];
  
  // Allow in DMs
  allowInDMs?: boolean;
}

@Injectable()
export class DiscordAgentPermissionService {
  private readonly logger = new Logger(DiscordAgentPermissionService.name);

  // Default config: Only mods and specific users can use /agent
  private config: AgentAccessConfig = {
    requireModPermissions: true,
    allowInDMs: true,
    allowedUserIds: [], // Add your user ID here
  };

  /**
   * Check if a user has permission to use /agent
   */
  async canUseAgent(
    user: User,
    member?: GuildMember,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // DMs - check config
    if (!member) {
      if (this.config.allowInDMs) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Agent commands not allowed in DMs' };
    }

    // Check if user is in allowlist
    if (this.config.allowedUserIds?.includes(user.id)) {
      this.logger.log(`User ${user.tag} allowed via allowlist`);
      return { allowed: true };
    }

    // Check mod permissions (MANAGE_MESSAGES or ADMINISTRATOR)
    if (this.config.requireModPermissions) {
      const hasMod = member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
                     member.permissions.has(PermissionsBitField.Flags.Administrator);
      
      if (!hasMod) {
        return {
          allowed: false,
          reason: 'You need moderator permissions to use /agent in this server',
        };
      }
    }

    // Check required roles
    if (this.config.requiredRoleNames && this.config.requiredRoleNames.length > 0) {
      const hasRole = member.roles.cache.some(role =>
        this.config.requiredRoleNames!.includes(role.name),
      );

      if (!hasRole) {
        return {
          allowed: false,
          reason: `You need one of these roles: ${this.config.requiredRoleNames.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a user can interact with an existing agent thread
   */
  async canInteractWithThread(
    user: User,
    threadOwnerId: string,
    member?: GuildMember,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Thread owner can always interact
    if (user.id === threadOwnerId) {
      return { allowed: true };
    }

    // Otherwise, same permission checks as creating
    return this.canUseAgent(user, member);
  }

  /**
   * Update config (e.g., from server settings)
   */
  updateConfig(config: Partial<AgentAccessConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log(`Agent permission config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * Get current config
   */
  getConfig(): AgentAccessConfig {
    return { ...this.config };
  }
}
