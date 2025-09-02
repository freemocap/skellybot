# syntax=docker/dockerfile:1.2

FROM node:20.10.0-slim

WORKDIR /workspace

# Remove the docker-clean file to preserve apt cache
RUN rm -rf /etc/apt/apt.conf.d/docker-clean

# Install system dependencies
RUN --mount=type=cache,target=/var/cache/apt apt-get update && apt-get install -y \
    dumb-init \
    htop \
    make \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and set up directories
RUN useradd -m appuser && \
    mkdir -p /home/appuser/.npm && \
    chown -R appuser:appuser /home/appuser/.npm && \
    chown -R appuser:appuser /workspace

# Switch to appuser for all subsequent operations
USER appuser

# Copy package files
COPY --chown=appuser:appuser package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/home/appuser/.npm,uid=1000,gid=1000 \
    npm ci --cache /home/appuser/.npm

# Copy source code and all project files
COPY --chown=appuser:appuser . .

# Build the NestJS application
RUN npm run build && \
    echo "=== Build complete, checking output ===" && \
    ls -la && \
    ls -la dist/ && \
    test -f dist/main.js || (echo "ERROR: dist/main.js not found after build!" && exit 1)

# Set production environment
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "start:prod"]
