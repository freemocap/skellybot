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

RUN --mount=type=cache,target=/var/cache/apt ./install_packages \
    dumb-init \
    htop

ENV PATH=/root/.local/bin:$PATH
COPY package-lock.json .
COPY package.json .
RUN --mount=type=cache,target=/root/.cache npm ci

RUN mkdir /home/.npm

# Switch to non-root user
RUN useradd -m appuser && chown -R appuser /workspace && chown -R appuser "/home/.npm"
USER appuser

# Copy project files
COPY . .

#ENTRYPOINT ["/usr/bin/dumb-init", "--"]
ENTRYPOINT ["/usr/bin/dumb-init", "--", "npm", "start"]
