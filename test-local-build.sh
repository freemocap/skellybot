#!/bin/bash

echo "=== Testing local build first ==="
echo ""

# Test local build
echo "1. Running npm install..."
npm ci

echo ""
echo "2. Running npm build..."
npm run build

echo ""
echo "3. Checking if dist/main.js exists..."
if [ -f "dist/main.js" ]; then
    echo "✓ dist/main.js found locally"
    ls -la dist/
else
    echo "✗ dist/main.js NOT found locally"
    echo "Build output:"
    ls -la
    exit 1
fi

echo ""
echo "=== Testing Docker build ==="
echo ""

# Build Docker image
echo "4. Building Docker image..."
docker build --progress=plain --no-cache -t skellybot-test:latest .

if [ $? -ne 0 ]; then
    echo "✗ Docker build failed"
    exit 1
fi

echo ""
echo "5. Checking Docker image contents..."
docker run --rm skellybot-test:latest ls -la dist/

if [ $? -ne 0 ]; then
    echo "✗ dist directory not found in Docker image"
    exit 1
fi

echo ""
echo "6. Testing container startup..."
docker run --rm --name skellybot-test skellybot-test:latest &
CONTAINER_PID=$!

# Wait 5 seconds
sleep 5

# Check if container is still running
if ps -p $CONTAINER_PID > /dev/null; then
    echo "✓ Container started successfully"
    kill $CONTAINER_PID
else
    echo "✗ Container crashed"
    exit 1
fi

echo ""
echo "=== All tests passed! ==="
