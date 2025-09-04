# syntax=docker/dockerfile:1.2

# Good base image to start from for most development
FROM node:20.10.0-slim

# Please remember, the base image we use /must be as small as possible/ for the best
# production deployments. This is not optional.

WORKDIR /workspace

# The official Debian/Ubuntu Docker Image automatically removes the cache by default!
# Removing the docker-clean file manages that issue.
RUN rm -rf /etc/apt/apt.conf.d/docker-clean

# Install system dependencies first (as root)
RUN --mount=type=cache,target=/var/cache/apt apt-get update && apt-get install -y \
    dumb-init \
    htop \
    make \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install npm dependencies (still as root for permissions)
RUN --mount=type=cache,target=/root/.cache npm ci

# Copy the rest of the application files
COPY . .

# Build the application (as root to ensure write permissions)
RUN npm run build

# Verify the build output exists
RUN ls -la /workspace/dist/ || echo "dist directory not found!"

# Create non-root user and set permissions AFTER building
RUN useradd -m appuser && chown -R appuser:appuser /workspace

# Switch to non-root user for runtime
USER appuser

ENV NODE_ENV=production

ENTRYPOINT ["/usr/bin/dumb-init", "--", "npm", "run", "start:prod"]
