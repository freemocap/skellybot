# Agent Tool Access Controls

## Philosophy

**Anyone can use `/agent`**, but **tool access depends on Discord permissions:**

- **Regular users**: Read-only AI (web search, fetch, analysis) ✅
- **Moderators**: Full tool access (can edit files, run code) ✅  
- **Admins (allowlist)**: Full tool access everywhere ✅

## How It Works

When you use `/agent`, the bot checks your Discord role and passes permission context to the AI:

```
[SYSTEM: User Permission Context]
User is REGULAR USER - Tool restrictions apply:
- ⛔ NO file write/edit operations (read-only)
- ⛔ NO code execution or installs
- ✅ Web search, fetch, and read operations OK
- ✅ Analysis and information tasks OK
User: JohnDoe#1234 (Regular User)
[END SYSTEM CONTEXT]

User message: Can you search for AI news?
```

**The AI reads this and restricts itself accordingly.**

## What Users See

### Regular User Creates Thread:

```
✨ OpenClaw Agent Chat Created

📖 Read-Only Tool Access:
- 🔍 Web search
- 📄 PDF reading
- 🌐 Web scraping
- 🖼️ Image analysis
- ⛔ File operations: Admin only
- ⛔ Code execution: Admin only

User: JohnDoe#1234 (Regular User)

initial message: Hello!
```

### Admin/Mod Creates Thread:

```
✨ OpenClaw Agent Chat Created

✅ Full Tool Access (Admin/Mod):
- 🔍 Web search
- 📄 PDF reading
- 🌐 Web scraping
- 💻 Code execution
- 📝 File operations
- 🖼️ Image analysis

User: AdminUser#5678 (Admin)

initial message: Hello!
```

## Configuration

Edit `src/interfaces/discord/services/discord-agent-permission.service.ts`:

```typescript
private config: AgentAccessConfig = {
  requireModPermissions: false, // Allow anyone to use
  allowInDMs: true,
  allowedUserIds: [
    'YOUR_DISCORD_USER_ID', // Add yours for full access everywhere
  ],
};
```

**To find your Discord User ID:**
1. Enable Developer Mode (Settings → Advanced)
2. Right-click your name → Copy ID

## Permission Levels

### Regular User
- ✅ Can create `/agent` threads
- ✅ Web search, fetch, scraping
- ✅ PDF reading, image analysis
- ✅ Information and analysis tasks
- ⛔ NO file write/edit
- ⛔ NO code execution
- ⛔ NO installs

### Moderator (MANAGE_MESSAGES or ADMINISTRATOR)
- ✅ Everything regular users can do
- ✅ File operations (read, write, edit)
- ✅ Code execution
- ✅ Install packages/tools

### Admin (Allowlist)
- ✅ Full access in all servers
- ✅ Same as moderator, but portable

## AI Tool Restrictions

The AI enforces these rules **itself** based on the permission context:

**Regular user asks:**  
"Can you edit this file?"

**AI responds:**  
"I can't edit files for regular users. You need moderator permissions for file operations. I can help you with web search, analysis, or read-only tasks though!"

**Admin asks:**  
"Can you edit this file?"

**AI responds:**  
*[Edits the file]*  
"Done! Updated the file as requested."

## Security Features

✅ **Permission context on every message** - Not just thread creation  
✅ **AI self-enforcement** - The AI knows its boundaries  
✅ **Clear user feedback** - Users know what tools they have access to  
✅ **Configurable per server** - Mods determined by Discord roles  
✅ **Admin allowlist** - Trusted users get full access everywhere  

## Testing

### Test as Regular User:

1. Use `/agent` in a server where you're NOT a mod
2. See "Read-Only Tool Access" message
3. Ask: "Can you edit a file?" → Should refuse
4. Ask: "Can you search for X?" → Should work

### Test as Mod:

1. Use `/agent` in a server where you ARE a mod
2. See "Full Tool Access" message
3. Ask: "Can you edit a file?" → Should work
4. Ask: "Can you search for X?" → Should work

### Test as Admin (Allowlist):

1. Add your user ID to allowlist
2. Use `/agent` anywhere
3. Should have full access in all servers

## Advanced: Per-Server Configuration

Want different rules per server? Store config in database:

```typescript
async getUserPermissionLevel(user: User, member?: GuildMember) {
  // Load server-specific config
  const serverConfig = await this.loadServerConfig(member?.guild.id);
  
  // Apply server rules
  if (serverConfig.allowedRoles?.includes(member.roles.highest.id)) {
    return { canUseFileTools: true, ... };
  }
  
  // Fall back to defaults
  ...
}
```

## FAQ

**Q: Can regular users see admin files?**  
A: No! File `read` is also restricted. They can only web search, fetch public URLs, analyze images.

**Q: Can users escalate permissions?**  
A: No. Permission context is injected by the bot based on Discord roles, not user input.

**Q: What if someone asks the AI to ignore restrictions?**  
A: The AI is instructed to refuse. If it doesn't, that's a bug - report it!

**Q: Can I make certain channels admin-only?**  
A: Yes! Use Discord's channel permissions to restrict who can post in those channels.

**Q: What about DMs?**  
A: DM users are treated as regular users unless they're in the admin allowlist.

## Example Conversations

### Regular User in Public Server:

**User:** "/agent text:Can you help me organize my workspace?"

**Bot:** [Creates thread with Read-Only Tool Access message]

**User:** "Can you create a folder called 'projects'?"

**AI:** "I can't create folders for regular users - file operations require moderator permissions. However, I can help you plan your folder structure and provide commands you can run yourself!"

### Admin in Any Server:

**User:** "/agent text:Organize my workspace"

**Bot:** [Creates thread with Full Tool Access message]

**User:** "Create a folder called 'projects'"

**AI:** "Creating folder..."  
*[Creates folder]*  
"Done! Created `projects/` directory."

## Logging

All permission checks are logged:

```
[DiscordAgentPermissionService] getUserPermissionLevel: User JohnDoe#1234 - Regular User (no file tools)
[DiscordAgentPermissionService] getUserPermissionLevel: User AdminUser#5678 - Admin (full access)
[DiscordAgentThreadService] Registered agent thread 123456 for user 789012 (Regular User)
```

Monitor logs to see what permission levels are being assigned.

## Summary

- ✅ **Open access**: Anyone can use `/agent`
- ✅ **Smart restrictions**: AI knows what it can/can't do based on role
- ✅ **Clear feedback**: Users see their tool access level upfront
- ✅ **Configurable**: Allowlist for trusted users, mods auto-detected
- ✅ **Secure**: Permissions enforced by bot + AI, not user input

**Safe for public servers!** Regular users get helpful AI without file system access. 🎉
