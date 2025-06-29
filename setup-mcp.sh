#!/bin/bash

# Setup GitHub MCP for Claude Code CLI
echo "Setting up GitHub MCP for Claude Code CLI..."

# Wait a moment to ensure Claude Code is ready
sleep 2

# Remove any existing github MCP configuration
claude-code mcp remove github -s local 2>/dev/null || true

# Add GitHub MCP server with environment variable
claude-code mcp add-json github "{\"command\": \"npx\", \"args\": [\"@modelcontextprotocol/server-github\"], \"env\": {\"GITHUB_PERSONAL_ACCESS_TOKEN\": \"$GITHUB_PERSONAL_ACCESS_TOKEN\"}}"

echo "GitHub MCP configured successfully!"

# List configured MCP servers
echo "Configured MCP servers:"
claude-code mcp list

echo "MCP setup complete!"