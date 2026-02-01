#!/bin/bash
set -e

# Start OpenClaw gateway in background
echo "Starting OpenClaw gateway..."
openclaw gateway start --bind=0.0.0.0 &
OPENCLAW_PID=$!

# Wait for gateway to be ready
sleep 5

# Start SkellyBot
echo "Starting SkellyBot..."
npm run start:prod &
SKELLYBOT_PID=$!

# Wait for both processes
wait $OPENCLAW_PID $SKELLYBOT_PID
