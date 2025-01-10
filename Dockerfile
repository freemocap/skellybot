# syntax=docker/dockerfile:1.2

# Good base image to start from for most development
# Stage 1: Node.js environment setup for NestJS
FROM node:20.10.0-slim AS node-build

# Please remember, the base image we use /must be as small as possible/ for the best
# production deployments. This is not optional.

WORKDIR /workspace

# The official Debian/Ubuntu Docker Image automatically removes the cache by default!
# Removing the docker-clean file manages that issue.
RUN rm -rf /etc/apt/apt.conf.d/docker-clean

COPY ./bin/builds/ .

# Switch to non-root user
RUN mkdir /home/.npm
RUN useradd -m appuser && chown -R appuser /workspace && chown -R appuser "/home/.npm"

RUN --mount=type=cache,target=/var/cache/apt ./install_packages \
    dumb-init \
    htop \
    make \
    g++ \
    python3

ENV PATH=/root/.local/bin:$PATH
COPY package-lock.json .
COPY package.json .
RUN --mount=type=cache,target=/root/.cache npm ci

USER appuser

# Copy project files
COPY . .

RUN npm run build

# Stage 2: Python environment setup
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS python-build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Clone the Python repository
RUN git clone https://github.com/freemocap/skellybot-analysis

# Change to the directory of the cloned repository
WORKDIR /app/skellybot-analysis

# Sync the Python environment with the frozen lockfile
RUN uv sync --frozen
ENV PYTHONPATH="${PYTHONPATH}:/app"

# Stage 3: Final image
FROM node:20.10.0-slim

# Recreate the appuser in the final stage
RUN useradd -m appuser

# Ensure dumb-init is installed
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Copy Node.js build artifacts
COPY --from=node-build /workspace /workspace

# Copy the Python environment
COPY --from=python-build /app /app

WORKDIR /workspace

USER appuser

ENV NODE_ENV=production
ENV PYTHONPATH="${PYTHONPATH}:/app"

# Define entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run both Node.js and Python commands
CMD ["sh", "-c", "npm run start:prod & uv run skellybot_analysis/__main__.py"]
