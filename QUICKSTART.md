# 🚀 Quick Start: `/agent` Command

## What You Got

A new `/agent` command in SkellyBot that gives you **full OpenClaw AI + tools**:

✅ Web search  
✅ PDF reading  
✅ Web scraping  
✅ File operations  
✅ Image analysis  
✅ Code execution  
✅ Memory  

## Setup (2 minutes)

### 1. Add OpenClaw config to .env

```bash
cd /home/skelly/.openclaw/workspace/skellybot

# Add these lines to your .env file:
echo "OPENCLAW_GATEWAY_URL=ws://192.168.1.219:18789" >> .env
echo "OPENCLAW_AUTH_TOKEN=478a4d3fc35f3c88a34a945852b7c6f1b6c89e849828afd1" >> .env
```

### 2. Install dependencies (if not already)

```bash
npm install
```

### 3. Start SkellyBot

```bash
npm run start:dev
```

### 4. Test in Discord

```
/agent text:"What's the latest AI news?"
```

## That's It!

The agent will:
- Create a thread
- Search the web
- Stream results back
- Keep context in the thread

## Files I Created

```
src/core/openclaw/
├── openclaw-client.service.ts   # WebSocket client
└── openclaw.module.ts            # Module export

src/interfaces/discord/commands/
└── discord-agent.command.ts      # /agent command

.env.openclaw.example             # Config template
OPENCLAW_INTEGRATION.md           # Full docs
QUICKSTART.md                     # This file
```

## Next Steps

1. **Test it** - Run `/agent` in Discord
2. **Try tools** - "Search for X", "Read this PDF"
3. **Compare** - `/chat` (basic) vs `/agent` (full power)
4. **Extend** - Add tool usage indicators, reactions, etc.

See `OPENCLAW_INTEGRATION.md` for details.
