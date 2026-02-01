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
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud SDK (for Secret Manager access)
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && \
    apt-get update && apt-get install -y google-cloud-cli && \
    rm -rf /var/lib/apt/lists/*

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

# Install OpenClaw globally for AI agent capabilities
RUN npm install -g openclaw

# Create non-root user and set permissions AFTER building
RUN useradd -m appuser && chown -R appuser:appuser /workspace

# Create OpenClaw config directory for appuser
RUN mkdir -p /home/appuser/.openclaw && chown -R appuser:appuser /home/appuser/.openclaw

# Copy startup scripts
COPY start-with-openclaw.sh /usr/local/bin/start-with-openclaw.sh
COPY start-with-secrets.sh /usr/local/bin/start-with-secrets.sh
RUN chmod +x /usr/local/bin/start-with-*.sh && chown appuser:appuser /usr/local/bin/start-with-*.sh

# Switch to non-root user for runtime
USER appuser

ENV NODE_ENV=production
ENV HOME=/home/appuser

# Use secret-fetching startup script by default (auto-detects GCP vs local)
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/start-with-secrets.sh"]
