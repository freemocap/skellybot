#!/bin/bash
set -e

echo "🚀 Starting SkellyBot with OpenClaw integration..."

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
