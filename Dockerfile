FROM node:20.10.0-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with unsafe-perm to avoid permission issues
RUN npm ci --unsafe-perm

# Copy source code and config files
COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./

# Build the application
RUN npm run build

# Verify the build succeeded
RUN test -f dist/main.js || (echo "Build failed - dist/main.js not found!" && ls -la dist/ && exit 1)

# Create non-root user for runtime
RUN useradd -m appuser && chown -R appuser:appuser /workspace
USER appuser

ENV NODE_ENV=production

ENTRYPOINT ["/usr/bin/dumb-init", "--", "node", "dist/main"]
