#!/bin/bash
set -e

echo "🚀 Starting SkellyBot with OpenClaw integration..."

# Check if running on GCP (has gcloud and metadata server)
if command -v gcloud &> /dev/null && curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/id &> /dev/null; then
    echo "🔐 Running on GCP - fetching secrets from Secret Manager..."
    
    PROJECT_ID=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/project/project-id)
    
    # Fetch secrets if not already set
    if [ -z "$DISCORD_BOT_TOKEN" ]; then
        echo "📥 Fetching discord-bot-token..."
        export DISCORD_BOT_TOKEN=$(gcloud secrets versions access latest --secret=discord-bot-token --project=$PROJECT_ID 2>/dev/null || echo "")
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "📥 Fetching openai-api-key..."
        export OPENAI_API_KEY=$(gcloud secrets versions access latest --secret=openai-api-key --project=$PROJECT_ID 2>/dev/null || echo "")
    fi
    
    echo "✅ Secrets loaded from GCP Secret Manager"
else
    echo "💻 Running locally - using environment variables"
    # Secrets should be in .env file or passed as env vars
fi

# Set OpenClaw URL (always localhost in container)
export OPENCLAW_GATEWAY_URL="ws://localhost:18789"

# Initialize OpenClaw if not already configured
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
    echo "📝 Initializing OpenClaw..."
    openclaw gateway init --bind=127.0.0.1 --port=18789
fi

# Extract auth token from config and export for SkellyBot
OPENCLAW_AUTH_TOKEN=$(grep -oP '"token"\s*:\s*"\K[^"]+' "$HOME/.openclaw/openclaw.json" || echo "")
export OPENCLAW_AUTH_TOKEN

echo "🔐 OpenClaw auth token configured"

# Start OpenClaw gateway in background
echo "🌐 Starting OpenClaw gateway..."
openclaw gateway start &
OPENCLAW_PID=$!

# Wait for gateway to be ready
echo "⏳ Waiting for OpenClaw gateway..."
sleep 5

# Verify OpenClaw is responding
if ! openclaw status > /dev/null 2>&1; then
    echo "❌ OpenClaw gateway failed to start!"
    exit 1
fi

echo "✅ OpenClaw gateway ready"

# Start SkellyBot
echo "🤖 Starting SkellyBot..."
exec npm run start:prod
