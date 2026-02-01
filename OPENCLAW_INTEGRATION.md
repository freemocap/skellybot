# OpenClaw Integration for SkellyBot

## What This Adds

The `/agent` command gives SkellyBot access to OpenClaw's full AI agent capabilities:

- 🔍 **Web Search** - Brave Search API integration
- 📄 **PDF Reading** - Extract and process PDF documents
- 🌐 **Web Scraping** - Fetch and extract content from URLs
- 💻 **Code Execution** - Run shell commands (when needed)
- 🖼️ **Image Analysis** - Vision model for image understanding
- 📁 **File Operations** - Read, write, edit files
- 🧠 **Memory** - Persistent memory across sessions
- 🤖 **Sub-agents** - Spawn background tasks
- And more!

## Architecture

```
Discord User → SkellyBot → OpenClaw Gateway → AI + Tools
                ↓
           Thread created
                ↓
       Streaming response
```

**How it works:**
1. User runs `/agent` command in Discord
2. SkellyBot creates a thread
3. Message is sent to OpenClaw via WebSocket
4. OpenClaw processes with tools
5. Response streams back to Discord thread
6. Each thread = isolated OpenClaw session

## Setup

### 1. Configure OpenClaw Connection

Copy the example env file:
```bash
cp .env.openclaw.example .env.openclaw
```

Edit `.env.openclaw` with your OpenClaw gateway details:
```env
OPENCLAW_GATEWAY_URL=ws://192.168.1.219:18789
OPENCLAW_AUTH_TOKEN=your-auth-token-here
```

**Finding your auth token:**
```bash
# From OpenClaw config
cat ~/.openclaw/openclaw.json | grep -A3 '"auth"' | grep token
```

### 2. Install Dependencies

```bash
npm install
# or
npm ci
```

### 3. Make Sure OpenClaw is Running

```bash
openclaw status
# Should show: Gateway local · ws://127.0.0.1:18789 · reachable
```

### 4. Start SkellyBot

```bash
npm run start:dev
```

## Usage

### Basic `/agent` Command

In any Discord channel:
```
/agent text:"What's the latest news about AI?"
```

SkellyBot will:
1. Create a thread
2. Search the web
3. Summarize results
4. Stream response back

### Context Menu

Right-click any message → `Open /agent thread`

Starts an agent chat with that message as the first input.

### In Threads

Once an `/agent` thread is created:
- Just send messages normally
- Agent maintains context
- Tools are available automatically
- Each thread is an isolated session

## Examples

**Web research:**
```
/agent text:"Search for recent papers on neural motion capture"
```

**PDF analysis:**
```
/agent text:"Read this PDF and summarize it"
[attach PDF]
```

**Multi-step tasks:**
```
/agent text:"Search for Python best practices, then create a cheat sheet"
```

**Image + web:**
```
/agent text:"What is this? Search for more info"
[attach image]
```

## Differences from `/chat`

| Feature | `/chat` | `/agent` |
|---------|---------|----------|
| AI Backend | OpenAI directly | OpenClaw (Anthropic) |
| Tools | None | Full toolkit |
| Web Search | ❌ | ✅ |
| PDF Reading | ❌ | ✅ |
| File Ops | ❌ | ✅ |
| Memory | Thread only | Persistent |
| Cost | Cheaper | More capable |

## Technical Details

### Files Added

```
src/core/openclaw/
├── openclaw-client.service.ts  # WebSocket client for OpenClaw gateway
└── openclaw.module.ts          # NestJS module

src/interfaces/discord/commands/
└── discord-agent.command.ts    # /agent slash command
```

### WebSocket Protocol

OpenClaw uses a JSON-RPC-style protocol:

**Request:**
```json
{
  "type": "req",
  "method": "sessions.send",
  "id": "unique-id",
  "params": {
    "sessionKey": "discord:agent:12345",
    "message": "Hello!",
    "agentId": "main"
  }
}
```

**Response (stream events):**
```json
{
  "type": "event",
  "event": "agent",
  "stream": "assistant",
  "text": "Hello! How can I help?",
  "phase": "start"
}
```

### Session Management

- Each Discord thread = unique OpenClaw session
- Session key: `discord:agent:{threadId}`
- Isolated context per thread
- Automatic cleanup on thread close

## Troubleshooting

**"WebSocket is not connected"**
- Check OpenClaw is running: `openclaw status`
- Verify OPENCLAW_GATEWAY_URL is correct
- Check auth token

**"RPC timeout"**
- OpenClaw may be processing slowly
- Check OpenClaw logs: `openclaw logs --follow`

**No response in thread**
- Check SkellyBot logs for errors
- Verify OpenClaw received message
- Test OpenClaw directly: `openclaw tui`

**Rate limits**
- Discord has rate limits on message edits
- Streaming updates are throttled to 1/sec
- Final message sends full response

## Next Steps

**Possible enhancements:**
- Show tool usage in Discord ("🔍 Searching web...")
- Add reaction buttons for common actions
- Implement /agent-stop to cancel long runs
- Add /agent-status to see what agent is doing
- Configure per-server agent settings

## Contributing

This integration bridges two powerful systems:
- **SkellyBot** - Discord interface + context management
- **OpenClaw** - AI orchestration + tools

Improvements welcome!
