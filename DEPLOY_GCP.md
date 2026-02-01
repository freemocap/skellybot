# Deploying SkellyBot + OpenClaw on GCP

## Current Setup Analysis

From your GitHub workflow, you're using:
- **GCE VM**: `skelly-bot-testing` (us-central1-a)
- **Deployment**: Docker build → Artifact Registry → VM restart
- **Project**: `mocap-test-project`

## Recommended Approach: Same VM

Install OpenClaw directly on your existing GCE VM alongside SkellyBot.

### Step 1: SSH into VM

```bash
gcloud compute ssh skelly-bot-testing --zone=us-central1-a
```

### Step 2: Install OpenClaw

```bash
# Install Node.js if not already (your VM likely has it)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install OpenClaw globally
sudo npm install -g openclaw

# Verify installation
openclaw --version
```

### Step 3: Configure OpenClaw

```bash
# Initialize OpenClaw
openclaw gateway init

# Get config
openclaw gateway config.get > ~/openclaw-config.json

# Edit config to bind to all interfaces (so Docker can reach it)
# Change "bind": "127.0.0.1" to "bind": "0.0.0.0"
nano ~/openclaw-config.json

# Apply config
openclaw gateway config.apply ~/openclaw-config.json
```

### Step 4: Set Up as Systemd Service

```bash
# Enable systemd service (auto-start on boot)
openclaw gateway start
systemctl --user enable openclaw-gateway

# Check status
systemctl --user status openclaw-gateway
openclaw status
```

### Step 5: Configure SkellyBot

Add to your `.env` (on the VM):

```env
OPENCLAW_GATEWAY_URL=ws://localhost:18789
OPENCLAW_AUTH_TOKEN=<get-from-openclaw-config>
```

Get the auth token:
```bash
cat ~/.openclaw/openclaw.json | grep -A3 '"auth"' | grep token
```

### Step 6: Test Connection

```bash
# From your SkellyBot process, test OpenClaw
openclaw status --deep

# Should show "Gateway local · ws://127.0.0.1:18789 · reachable"
```

## Alternative: Docker Compose (Both Services)

If you want everything in Docker:

### docker-compose.yml

```yaml
version: '3.8'

services:
  openclaw:
    image: node:20-slim
    container_name: openclaw-gateway
    command: >
      bash -c "npm install -g openclaw && 
               openclaw gateway init &&
               openclaw gateway start --bind=0.0.0.0"
    ports:
      - "18789:18789"
    volumes:
      - openclaw-data:/root/.openclaw
    restart: unless-stopped

  skellybot:
    build: .
    container_name: skellybot
    depends_on:
      - openclaw
    environment:
      - OPENCLAW_GATEWAY_URL=ws://openclaw:18789
      - OPENCLAW_AUTH_TOKEN=${OPENCLAW_AUTH_TOKEN}
      # ... other env vars
    restart: unless-stopped

volumes:
  openclaw-data:
```

Deploy:
```bash
docker-compose up -d
```

## Firewall / Network Setup

### Internal Communication (Default)

If SkellyBot and OpenClaw are on the same VM:
- ✅ No firewall rules needed
- ✅ Use `localhost:18789`
- ✅ Fast and secure

### External Access (If Needed)

**⚠️ Only do this if you need external access!**

```bash
# Allow WebSocket traffic to OpenClaw
gcloud compute firewall-rules create allow-openclaw \
  --allow tcp:18789 \
  --target-tags=openclaw-gateway \
  --source-ranges=0.0.0.0/0  # ⚠️ Or restrict to specific IPs

# Add network tag to your VM
gcloud compute instances add-tags skelly-bot-testing \
  --zone=us-central1-a \
  --tags=openclaw-gateway
```

**Then use external IP:**
```env
OPENCLAW_GATEWAY_URL=ws://<external-ip>:18789
```

## Security Checklist

- [x] Keep auth token secret (don't commit to git)
- [x] Use internal networking when possible
- [x] Restrict firewall rules to specific IPs if external
- [x] Enable systemd auto-restart
- [x] Monitor logs: `openclaw logs --follow`

## Resource Requirements

**Current VM specs:**
- Check: `gcloud compute instances describe skelly-bot-testing --zone=us-central1-a`

**Recommended minimums:**
- **CPU**: 2 vCPUs (e2-medium or better)
- **RAM**: 4GB (8GB preferred for heavy usage)
- **Disk**: 20GB (for logs + temp files)

**OpenClaw overhead:**
- ~200-300MB RAM idle
- Scales with active sessions
- CPU usage depends on tool usage

## Monitoring

```bash
# Check OpenClaw status
openclaw status --deep

# View logs
openclaw logs --follow

# Check systemd service
systemctl --user status openclaw-gateway

# Resource usage
htop
```

## Updating

```bash
# Update OpenClaw
sudo npm update -g openclaw

# Restart gateway
systemctl --user restart openclaw-gateway

# Check version
openclaw --version
```

## Rollback Plan

If something breaks:

```bash
# Stop OpenClaw
systemctl --user stop openclaw-gateway

# SkellyBot will still work (/chat command)
# /agent command will fail gracefully

# Check logs
journalctl --user -u openclaw-gateway -n 100
```

## Cost Estimate

**Same VM (Recommended):**
- No additional cost
- Minimal overhead (~$2-5/month extra for increased resource usage)

**Separate VM:**
- e2-medium: ~$25/month
- Network egress: Usually free within same zone
- Total: ~$25-30/month

## Next Steps

1. **Test locally first** (on your Pi) ✅ Already working!
2. **Deploy to GCP VM** (follow steps above)
3. **Test `/agent` command** in Discord
4. **Monitor for 24-48h** (check logs, resource usage)
5. **Optimize** if needed (bigger VM, separate VM, etc.)

## Questions?

- "Is it safe?" → Yes, OpenClaw is production-ready
- "Will it break SkellyBot?" → No, `/chat` still works independently
- "What if OpenClaw crashes?" → Systemd auto-restarts it
- "Can I roll back?" → Yes, just stop the service

Ready to deploy! 🚀
