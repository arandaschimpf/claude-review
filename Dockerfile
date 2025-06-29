FROM node:18-alpine

# Install bash and other necessary tools
RUN apk add --no-cache bash

# Install Claude Code CLI and GitHub MCP
RUN npm install -g @anthropic-ai/claude-code@latest @modelcontextprotocol/server-github

# Fix Claude Code CLI shebang issue for Alpine
RUN echo '#!/bin/sh' > /usr/local/bin/claude-code && \
    echo 'exec node --no-warnings --enable-source-maps /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js "$@"' >> /usr/local/bin/claude-code && \
    chmod +x /usr/local/bin/claude-code

# Set SHELL environment variable for Claude Code CLI
ENV SHELL=/bin/bash

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Copy public directory to the correct location
RUN cp -r public dist/

# Create logs directory for PM2
RUN mkdir -p logs

RUN npm prune --omit=dev

# Create Claude configuration directory and volume mount point
RUN mkdir -p /root/.config/claude
RUN mkdir -p /root/.claude

# Copy Claude configuration
COPY claude_config.json /root/.config/claude/claude_desktop_config.json

# Create entrypoint script to configure MCP on container start
COPY setup-mcp.sh /usr/local/bin/setup-mcp.sh
RUN chmod +x /usr/local/bin/setup-mcp.sh

EXPOSE 8080

CMD ["/bin/bash", "-c", "setup-mcp.sh && npx pm2-runtime start ecosystem.config.js"]