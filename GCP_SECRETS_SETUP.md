# GCP Secret Manager Setup for SkellyBot + OpenClaw

## Current Setup

Your VM uses:
- **Service Account**: `nest-bot@mocap-test-project.iam.gserviceaccount.com`
- **Scopes**: `cloud-platform` (full access)
- **OS**: Container-Optimized OS (COS)
- **Container**: Auto-pulled from Artifact Registry

## Option 1: Use GCP Secret Manager (Recommended)

### Step 1: Create Secrets in Secret Manager

```bash
# Create secrets for all required env vars
gcloud secrets create discord-bot-token \
    --replication-policy="automatic" \
    --project=mocap-test-project

gcloud secrets create openai-api-key \
    --replication-policy="automatic" \
    --project=mocap-test-project

# Add secret values
echo -n "your-discord-token" | gcloud secrets versions add discord-bot-token \
    --data-file=- \
    --project=mocap-test-project

echo -n "your-openai-key" | gcloud secrets versions add openai-api-key \
    --data-file=- \
    --project=mocap-test-project

# List secrets to verify
gcloud secrets list --project=mocap-test-project
```

### Step 2: Grant Service Account Access

```bash
# Allow service account to read secrets
gcloud secrets add-iam-policy-binding discord-bot-token \
    --member="serviceAccount:nest-bot@mocap-test-project.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=mocap-test-project

gcloud secrets add-iam-policy-binding openai-api-key \
    --member="serviceAccount:nest-bot@mocap-test-project.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=mocap-test-project
```

### Step 3: Update Startup Script to Fetch Secrets

Create `fetch-secrets.sh`:

```bash
#!/bin/bash
# This runs BEFORE the container starts

# Fetch secrets from Secret Manager
export DISCORD_BOT_TOKEN=$(gcloud secrets versions access latest \
    --secret="discord-bot-token" \
    --project=mocap-test-project)

export OPENAI_API_KEY=$(gcloud secrets versions access latest \
    --secret="openai-api-key" \
    --project=mocap-test-project)

# OpenClaw will auto-configure its token
export OPENCLAW_GATEWAY_URL="ws://localhost:18789"

# Pass to container
docker run -d \
    --restart=always \
    -e DISCORD_BOT_TOKEN="$DISCORD_BOT_TOKEN" \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" \
    -e OPENCLAW_GATEWAY_URL="$OPENCLAW_GATEWAY_URL" \
    us-east1-docker.pkg.dev/mocap-test-project/jonbot/nestbot:latest
```

### Step 4: Update VM to Use Startup Script

```bash
# Create startup script in GCS or metadata
gcloud compute instances add-metadata skelly-bot-testing \
    --metadata-from-file startup-script=fetch-secrets.sh \
    --zone=us-central1-a
```

## Option 2: Container Environment Variables (Simpler)

Update your GCE instance creation command to pass env vars directly:

```bash
gcloud compute instances update-container skelly-bot-testing \
    --zone=us-central1-a \
    --container-env DISCORD_BOT_TOKEN=your-token \
    --container-env OPENAI_API_KEY=your-key \
    --container-env OPENCLAW_GATEWAY_URL=ws://localhost:18789
```

**Cons:** Env vars stored in VM metadata (less secure than Secret Manager)

## Option 3: Mount Secrets as Files (Most Secure)

```bash
# Create secret versions
gcloud secrets create skellybot-env \
    --replication-policy="automatic" \
    --data-file=.env.production \
    --project=mocap-test-project

# Mount in container
gcloud compute instances update-container skelly-bot-testing \
    --zone=us-central1-a \
    --container-mount-host-path mount-path=/secrets,host-path=/var/secrets,mode=ro
```

Update `start-with-openclaw.sh` to read from `/secrets/.env`

## Recommended: Option 1 (Secret Manager)

**Why:**
- ✅ Secrets never stored in VM metadata
- ✅ Automatic rotation support
- ✅ Audit logging (who accessed what)
- ✅ IAM-based access control
- ✅ Works with your existing service account

**Cost:** ~$0.06/month per secret (negligible)

## What Secrets You Need

### Required:
- `DISCORD_BOT_TOKEN` - From Discord Developer Portal
- `OPENAI_API_KEY` - From OpenAI (for /chat command)

### Optional:
- `MONGODB_URI` - If using database features
- `SLACK_BOT_TOKEN` - If using Slack
- Any other API keys

### Auto-Generated:
- `OPENCLAW_AUTH_TOKEN` - Auto-configured by startup script (no secret needed!)

## Testing Locally vs Production

**Local (.env file):**
```env
DISCORD_BOT_TOKEN=dev-token-here
OPENAI_API_KEY=dev-key-here
OPENCLAW_GATEWAY_URL=ws://localhost:18789
```

**Production (Secret Manager):**
```bash
# Fetched at container startup
gcloud secrets versions access latest --secret=discord-bot-token
```

## Quick Setup Script

Want to do this all at once?

```bash
#!/bin/bash
# setup-gcp-secrets.sh

PROJECT="mocap-test-project"
SA="nest-bot@mocap-test-project.iam.gserviceaccount.com"

# Create secrets
gcloud secrets create discord-bot-token --replication-policy=automatic --project=$PROJECT
gcloud secrets create openai-api-key --replication-policy=automatic --project=$PROJECT

# Add values (you'll be prompted)
echo "Enter Discord bot token:"
read -s DISCORD_TOKEN
echo -n "$DISCORD_TOKEN" | gcloud secrets versions add discord-bot-token --data-file=- --project=$PROJECT

echo "Enter OpenAI API key:"
read -s OPENAI_KEY
echo -n "$OPENAI_KEY" | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT

# Grant access
gcloud secrets add-iam-policy-binding discord-bot-token \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT

gcloud secrets add-iam-policy-binding openai-api-key \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT

echo "✅ Secrets configured!"
echo "Next: Update your VM startup script to fetch these secrets"
```

## Verify It Works

```bash
# SSH into VM
gcloud compute ssh skelly-bot-testing --zone=us-central1-a

# Try fetching a secret (should work with your service account)
gcloud secrets versions access latest --secret=discord-bot-token

# Check container logs
docker logs -f $(docker ps -q)
```

## Next Steps

1. **Choose your approach** (I recommend Option 1: Secret Manager)
2. **Create secrets** with the setup script above
3. **Update your Dockerfile/startup** to fetch secrets
4. **Test it** by restarting the VM
5. **Verify** the container starts and connects to Discord

Want me to update the Dockerfile to automatically fetch from Secret Manager on startup?
