# syntax=docker/dockerfile:1.2

# Good base image to start from for most development
FROM node:20.10.0-slim

# Please remember, the base image we use /must be as small as possible/ for the best
# production deployments. This is not optional.

WORKDIR /workspace

# The official Debian/Ubuntu Docker Image automatically removes the cache by default!
# Removing the docker-clean file manages that issue.
RUN rm -rf /etc/apt/apt.conf.d/docker-clean

COPY ./bin/builds/ .

# Create non-root user and set up directories
RUN mkdir /home/.npm
RUN useradd -m appuser && chown -R appuser /workspace && chown -R appuser "/home/.npm"

RUN --mount=type=cache,target=/var/cache/apt ./install_packages \
    dumb-init \
    htop \
    make \
    g++ \
    python3

ENV PATH=/root/.local/bin:$PATH
COPY --chown=appuser:appuser package-lock.json package.json ./
RUN --mount=type=cache,target=/root/.cache npm ci

USER appuser

# Copy project files with correct ownership
COPY --chown=appuser:appuser . .

# Build the application
RUN npm run build

ENV NODE_ENV=production

ENTRYPOINT ["/usr/bin/dumb-init", "--", "npm", "run", "start:prod"]
