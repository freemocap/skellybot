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

## How It Works

OpenClaw runs **inside the same Docker container** as SkellyBot:
- Auto-starts when container starts
- Communicates via localhost (no network config needed)
- Auth token auto-configured
- Runs as same user (appuser)

## Setup for GCP Deployment

### 1. Just push to GitHub!

```bash
# Commit your changes
git add .
git commit -m "Add OpenClaw integration"
git push origin jon/openclaw

# GitHub Actions will:
# 1. Build Docker image with OpenClaw
# 2. Push to Artifact Registry
# 3. Restart GCE VM (pulls new image)
```

### 2. Test in Discord

Once deployed:
```
/agent text:"What's the latest AI news?"
```

## Local Development Setup

If testing locally (not on GCP):

```bash
cd /home/skelly/.openclaw/workspace/skellybot

# Add to .env:
echo "OPENCLAW_GATEWAY_URL=ws://localhost:18789" >> .env

# Install dependencies
npm install

# Start (runs both SkellyBot + OpenClaw)
./start-with-openclaw.sh
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
