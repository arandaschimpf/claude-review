FROM node:18-alpine

# Install bash, git and other necessary tools
RUN apk add --no-cache bash git

# Install Claude Code CLI, GitHub MCP, and TypeScript globally
RUN npm install -g @anthropic-ai/claude-code@latest @modelcontextprotocol/server-github typescript

# Fix Claude Code CLI shebang issue for Alpine
RUN echo '#!/bin/sh' > /usr/local/bin/claude-code && \
    echo 'exec node --no-warnings --enable-source-maps /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js "$@"' >> /usr/local/bin/claude-code && \
    chmod +x /usr/local/bin/claude-code

# Set SHELL environment variable for Claude Code CLI
ENV SHELL=/bin/bash

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S claude -u 1001 -G nodejs

WORKDIR /app

# Install dependencies as root first
COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x update.sh
RUN npm run build

# Public directory not needed for this application

# Create logs directory for PM2
RUN mkdir -p logs

# Keep dev dependencies for in-container updates
# RUN npm prune --omit=dev

# Create Claude configuration directory for non-root user
RUN mkdir -p /home/claude/.config/claude
RUN mkdir -p /home/claude/.claude

# Claude configuration will be created by setup script

# Change ownership of app directory to non-root user
RUN chown -R claude:nodejs /app
RUN chown -R claude:nodejs /home/claude

# Create entrypoint script to configure MCP on container start
COPY setup-mcp.sh /usr/local/bin/setup-mcp.sh
RUN chmod +x /usr/local/bin/setup-mcp.sh

# Update script will be available in /app after COPY . . and made executable there

# Switch to non-root user
USER claude

EXPOSE 8080

CMD ["/bin/bash", "-c", "setup-mcp.sh && npx pm2-runtime start ecosystem.config.js"]