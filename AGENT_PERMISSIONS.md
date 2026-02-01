# Agent Thread Permissions & Security

## Problem

When using `/agent` in public Discord servers, you need to prevent random users from:
- Hijacking your agent sessions
- Accessing your context/memory
- Polluting the conversation with unwanted messages

## Solution

The `/agent` command now has built-in permission controls:

### Default Behavior

**Who can create `/agent` threads:**
- Server moderators (anyone with MANAGE_MESSAGES or ADMINISTRATOR permissions)
- Users in the allowlist (configured per-bot)
- Anyone in DMs (if enabled)

**Who can interact with existing threads:**
- The thread owner (person who created it)
- Server moderators
- Users in the allowlist

### How It Works

1. **When `/agent` is run:**
   - Check if user has mod permissions OR is in allowlist
   - If no: Deny with message explaining why
   - If yes: Create thread and register ownership

2. **When someone messages in an agent thread:**
   - Check if they're the owner OR a mod
   - If no: Reply with permission error, ignore message
   - If yes: Send message to OpenClaw

3. **Session isolation:**
   - Each thread = isolated OpenClaw session
   - Sessions keyed by thread ID: `discord:agent:{threadId}`
   - No cross-contamination between threads

## Configuration

### Option 1: Add Your User ID to Allowlist

Edit `discord-agent-permission.service.ts`:

```typescript
private config: AgentAccessConfig = {
  requireModPermissions: true,
  allowInDMs: true,
  allowedUserIds: ['YOUR_DISCORD_USER_ID_HERE'], // <-- Add yours!
};
```

**To find your Discord user ID:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your name → Copy ID

### Option 2: Require Specific Roles

```typescript
private config: AgentAccessConfig = {
  requireModPermissions: false, // Turn off mod requirement
  requiredRoleNames: ['Agent User', 'Trusted'], // Require one of these roles
  allowInDMs: true,
};
```

### Option 3: Mod-Only (Most Secure)

```typescript
private config: AgentAccessConfig = {
  requireModPermissions: true, // Only mods can use
  allowInDMs: false, // Disable DMs entirely
};
```

### Option 4: Open Access (Not Recommended for Public Servers)

```typescript
private config: AgentAccessConfig = {
  requireModPermissions: false,
  allowInDMs: true,
  // No restrictions - anyone can use /agent
};
```

## What Users See

### When Denied Permission:

```
⛔ You need moderator permissions to use /agent in this server

Only moderators or the thread owner can interact with agent threads.
```

### When Thread is Created:

```
✨ OpenClaw Agent Chat Created by YourUsername#1234

Tools enabled:
- 🔍 Web search
- 📄 PDF reading
- 🌐 Web scraping
- 💻 Code execution
- 🖼️ Image analysis
- And more!

🔒 Only moderators or YourUsername#1234 can interact with this thread.

initial message: Hello!
```

### When Non-Mod Tries to Message:

```
⛔ You need moderator permissions to use /agent in this server

Only moderators or the thread owner can interact with agent threads.
```

## Security Features

✅ **Permission checks on every message** - Not just thread creation  
✅ **Thread ownership tracking** - Owner always has access  
✅ **Mod override** - Mods can help in any thread  
✅ **Session isolation** - Each thread = separate OpenClaw session  
✅ **Allowlist support** - Trusted users across all servers  
✅ **DM control** - Enable/disable private messages  

## Advanced: Dynamic Configuration

Want to let server admins configure this?

```typescript
// In a server config command:
@SlashCommand({
  name: 'agent-config',
  description: 'Configure agent permissions',
})
async onAgentConfig(@Context() [interaction]: SlashCommandContext) {
  // Check if user is admin
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
    await interaction.reply('⛔ Admin only');
    return;
  }

  // Update config
  this._permissionService.updateConfig({
    requireModPermissions: true,
    requiredRoleNames: ['Agent Access'],
  });

  await interaction.reply('✅ Agent permissions updated!');
}
```

## Logging

All permission checks are logged:

```
[DiscordAgentPermissionService] User JohnDoe#1234 allowed via allowlist
[DiscordAgentPermissionService] User BadActor#5678 denied /agent access: You need moderator permissions
```

Monitor logs to see who's trying to access agents.

## Testing

### Test Permission Checks:

1. **As non-mod** in public server → Should be denied
2. **As mod** in public server → Should work
3. **As allowlist user** → Should work everywhere
4. **In DMs** → Should work (if enabled)

### Test Thread Isolation:

1. Create two `/agent` threads
2. Talk about different topics in each
3. Verify they don't cross-contaminate

### Test Thread Ownership:

1. User A creates `/agent` thread
2. User B (non-mod) tries to message in it → Should be denied
3. User A messages in it → Should work

## Cleanup

Old threads are tracked in memory. To clean up:

```typescript
// In a cron job or scheduled task:
this._agentThreadService.cleanupOldThreads(24); // Remove threads older than 24h
```

## Next Steps

1. **Set your user ID** in the allowlist
2. **Deploy** to GCP
3. **Test** in a public server
4. **Monitor logs** for permission denials
5. **Adjust config** as needed

## FAQ

**Q: Can I have different configs per server?**  
A: Yes! Store config in database keyed by guild ID, load on command execution.

**Q: What if I want some users to have read-only access?**  
A: Possible! Add a `canViewOnly` permission that allows reading but not sending.

**Q: Can thread owners revoke their own thread?**  
A: Add a `/agent-close` command that removes thread from active tracking.

**Q: What about rate limiting?**  
A: Add rate limiting per user in `handleThreadMessage()` using a Map<userId, lastMessageTime>.

## Summary

- ✅ Mod-only by default (secure for public servers)
- ✅ Allowlist for trusted users
- ✅ Thread ownership enforced
- ✅ Every message checked
- ✅ Session isolation guaranteed
- ✅ Configurable per your needs

You're safe to use `/agent` in public servers now! 🎉
