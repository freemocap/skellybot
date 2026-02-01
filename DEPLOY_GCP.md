# Deploying SkellyBot + OpenClaw to GCP

## Architecture Overview

Your current setup (from GitHub Actions workflow):
1. **GitHub push to main** → Triggers workflow
2. **Docker build** → Creates container with SkellyBot
3. **Push to Artifact Registry** → us-east1 registry
4. **GCE VM restart** → `skelly-bot-testing` pulls new image and runs it

## What's Changed

The Dockerfile now includes:
- **OpenClaw installed globally** (npm install -g openclaw)
- **Startup script** that launches both services
- **Auto-configuration** of OpenClaw on first run
- **Localhost communication** (no network setup needed)

## Deployment Process

### Automatic (Recommended)

Just push your code:

```bash
# From your local machine or Pi
cd /home/skelly/.openclaw/workspace/skellybot
git add .
git commit -m "feat: Add OpenClaw integration"
git push origin jon/openclaw
```

GitHub Actions will:
1. ✅ Build Docker image with OpenClaw
2. ✅ Push to Artifact Registry  
3. ✅ Restart GCE VM (auto-pulls new image)
4. ✅ Container starts both SkellyBot + OpenClaw

### Manual Build (For Testing)

```bash
# Build locally
docker build -t skellybot-openclaw .

# Test locally
docker run -it --rm \
  -e DISCORD_TOKEN=$DISCORD_TOKEN \
  -e OPENCLAW_GATEWAY_URL=ws://localhost:18789 \
  skellybot-openclaw
```

## How It Works Inside the Container

**Startup sequence** (`start-with-openclaw.sh`):

1. Check if OpenClaw configured (`~/.openclaw/openclaw.json`)
2. If not, run `openclaw gateway init`
3. Extract auth token and export as `OPENCLAW_AUTH_TOKEN`
4. Start OpenClaw gateway in background
5. Wait for gateway to be ready
6. Start SkellyBot with `npm run start:prod`

**Process tree:**
```
dumb-init (PID 1)
  └─ start-with-openclaw.sh
       ├─ openclaw-gateway (background)
       └─ node dist/main.js (SkellyBot)
```

**Communication:**
- Both services run as `appuser` (non-root)
- OpenClaw binds to 127.0.0.1:18789
- SkellyBot connects to ws://localhost:18789
- No external ports needed (all internal)

## Environment Variables

The container needs:

```env
# Discord (already configured)
DISCORD_TOKEN=your-discord-token

# OpenClaw (auto-configured by startup script)
OPENCLAW_GATEWAY_URL=ws://localhost:18789
OPENCLAW_AUTH_TOKEN=<extracted-from-config>

# Other SkellyBot vars...
```

**Important:** `OPENCLAW_AUTH_TOKEN` is automatically extracted from OpenClaw's config file on startup. You don't need to set it manually.

## Verify Deployment

### 1. Check Container Logs

```bash
gcloud compute ssh skelly-bot-testing --zone=us-central1-a

# View container logs
docker logs -f <container-id>
```

Look for:
```
🚀 Starting SkellyBot with OpenClaw integration...
📝 Initializing OpenClaw...
🔐 OpenClaw auth token configured
🌐 Starting OpenClaw gateway...
✅ OpenClaw gateway ready
🤖 Starting SkellyBot...
```

### 2. Test `/agent` Command

In Discord:
```
/agent text:"Hello! Can you search the web for latest AI news?"
```

Should:
- Create a thread
- Show typing indicator
- Stream response with web search results

## Troubleshooting

### "WebSocket connection failed"

**Cause:** OpenClaw gateway not started properly

**Fix:**
```bash
# SSH into VM
gcloud compute ssh skelly-bot-testing --zone=us-central1-a

# Check if openclaw is running
docker exec -it <container-id> ps aux | grep openclaw

# Check OpenClaw status
docker exec -it <container-id> openclaw status
```

### "Gateway init failed"

**Cause:** Permissions issue or missing directory

**Fix:** Check Dockerfile has:
```dockerfile
RUN mkdir -p /home/appuser/.openclaw && chown -R appuser:appuser /home/appuser/.openclaw
```

### Container won't start

**Cause:** Startup script issue

**Debug:**
```bash
# Run container interactively
docker run -it --entrypoint=/bin/bash skellybot-openclaw

# Test startup script manually
/usr/local/bin/start-with-openclaw.sh
```

### "/agent command not found"

**Cause:** SkellyBot didn't register the command

**Fix:** 
- Verify `discord-agent.command.ts` is in the build
- Check Discord bot has correct permissions
- Re-run Discord slash command sync

## Resource Usage

**Expected overhead from OpenClaw:**
- **CPU:** +10-20% idle, +50-100% during tool use
- **RAM:** +200-300MB idle, +500MB-1GB during heavy use
- **Disk:** +100MB for OpenClaw installation

**Current VM specs** (check with):
```bash
gcloud compute instances describe skelly-bot-testing --zone=us-central1-a
```

**Recommended minimum:**
- 2 vCPUs
- 4GB RAM
- 20GB disk

## Scaling Considerations

### If you need to scale:

**Option 1: Bigger VM**
```bash
gcloud compute instances stop skelly-bot-testing --zone=us-central1-a

gcloud compute instances set-machine-type skelly-bot-testing \
  --machine-type=e2-standard-2 \
  --zone=us-central1-a

gcloud compute instances start skelly-bot-testing --zone=us-central1-a
```

**Option 2: Separate VMs**
- Run OpenClaw on dedicated VM
- Update `OPENCLAW_GATEWAY_URL` to use internal IP
- More complex but better isolation

## Security Notes

✅ **Good:**
- OpenClaw auth token auto-generated (not hardcoded)
- Runs as non-root user
- Internal-only communication (localhost)
- No external ports exposed

⚠️ **Important:**
- Auth token stored in container filesystem
- Regenerated on each fresh container start
- Sessions lost on container restart (expected)

## Rollback

If something breaks:

```bash
# Revert to previous image
gcloud compute ssh skelly-bot-testing --zone=us-central1-a

# Pull specific tag
docker pull us-east1-docker.pkg.dev/mocap-test-project/jonbot/nestbot:<previous-sha>

# Restart with old image
docker stop <container-id>
docker run <old-image>
```

Or revert Git commit and push to trigger rebuild.

## Monitoring

```bash
# Container status
docker ps

# Resource usage
docker stats

# OpenClaw logs
docker exec -it <container-id> openclaw logs --follow

# SkellyBot logs  
docker logs -f <container-id>
```

## Cost Impact

**Same VM:** ~$2-5/month extra for increased resource usage

**No additional VMs needed!** ✅

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Watch GitHub Actions build
3. ✅ Wait for VM restart (automatic)
4. ✅ Test `/agent` in Discord
5. ✅ Monitor logs for first 24h
6. ✅ Celebrate 🎉

## File Reference

**Modified:**
- `Dockerfile` - Added OpenClaw installation + startup script
- `src/interfaces/discord/discord.module.ts` - Added agent command

**New:**
- `start-with-openclaw.sh` - Startup script
- `src/core/openclaw/openclaw-client.service.ts` - WebSocket client
- `src/core/openclaw/openclaw.module.ts` - NestJS module
- `src/interfaces/discord/commands/discord-agent.command.ts` - `/agent` command
- `.env.openclaw.example` - Config template (uses localhost)

That's it! Everything deploys automatically through your existing GitHub Actions workflow. 🚀
