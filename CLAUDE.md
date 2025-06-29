# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript (output: `dist/`)
- `npm start` - Run production server
- `npm run dev` - Development mode with hot reload using tsx

### PM2 Process Management
- `npm run start:pm2` - Start app with PM2
- `npm run stop:pm2` - Stop PM2 process
- `npm run restart:pm2` - Restart PM2 process
- `npm run logs:pm2` - View PM2 logs

### Docker
- `docker-compose up` - Run complete containerized application
- Container runs on port 8080 with volume persistence
- Container uses PM2 runtime for process stability and auto-restart

### In-Container Deployment
- `POST /api/deploy` - Triggers git pull, build, and PM2 reload
- Zero-downtime updates preserving Claude authentication state
- Automatic backup and rollback on build failures
- Manual deployment: `docker exec <container> /usr/local/bin/update.sh`

## Architecture Overview

This is a **Koa.js web service** with API key-based authentication system. The service uses NeDB for data persistence and follows a controller-service pattern for clean code organization.

### Core Structure
- `src/index.ts` - Main Koa application setup and server initialization
- `src/types.ts` - TypeScript interfaces and type definitions
- `src/controllers/` - Route handlers and request/response logic
  - `ApiKeyController.ts` - API key management operations
  - `HealthController.ts` - Health check endpoint
- `src/services/` - Business logic and data operations  
  - `ApiKeyService.ts` - API key CRUD operations and database management
- `src/middleware/` - Authentication and request processing
  - `auth.ts` - API key authentication and admin authorization
- `src/routes/` - Route definitions and middleware composition
- `data/` - NeDB database files (created automatically)

### Authentication System
- Master/admin API key from environment variable (`MASTER_API_KEY`)
- Regular API keys created/managed by admin keys
- Header-based authentication using `x-api-key`
- Two-tier permission system (admin vs regular keys)

### Current Endpoints
- `/health` - Health check endpoint (no auth required)
- `POST /api/review` - Initiate PR review using Claude CLI (auth required)
- `POST /api/deploy` - Deploy latest code from git repository (admin only)
- `GET /api/deploy/status` - Get current deployment status and PM2 info (admin only)
- `POST /api/keys` - Create new API key (admin only)
- `GET /api/keys` - List all API keys (admin only) 
- `DELETE /api/keys/:key` - Delete API key (admin only)

### Container Architecture
- Multi-stage Docker build with Node.js 18 Alpine
- Claude Code CLI and GitHub MCP server installed globally via npm
- Git and development tools kept for in-container updates
- Claude configuration directory setup at `/root/.config/claude`
- MCP setup script (`setup-mcp.sh`) runs on container start
- Update script (`update.sh`) available at `/usr/local/bin/update.sh`
- Volume persistence for Claude authentication state

## Environment Variables
- `MASTER_API_KEY` - Master/admin API key for initial setup and key management
- `REPO_URL` - Git repository URL for deployments (defaults to `https://github.com/arandaschimpf/claude-review.git`)
- `PORT` - Server port (defaults to 8080)
- `NODE_ENV` - Environment mode
- `SHELL` - Set to `/bin/bash` for Claude Code CLI compatibility
- Additional environment variables can be provided via `.env` file

## Technical Notes
- TypeScript compilation target: ES2020 with CommonJS modules
- Docker container includes bash, git and necessary tools for Claude Code CLI
- Claude Code CLI shebang issue fixed for Alpine Linux compatibility
- Volume mount for `/root/.claude` to persist authentication across container restarts
- PR review endpoint uses shell command substitution to combine `prompt.txt` with PR URL
- Claude CLI calls are executed non-interactively with `-p` flag and run asynchronously
- PM2 provides process management with auto-restart, memory monitoring (1GB limit), and structured logging
- PM2 ecosystem configuration includes error/output/combined log files in `/app/logs/` directory
- In-container deployment system preserves Claude authentication while updating code
- Development dependencies kept in production for TypeScript compilation during updates
- Deployment script includes backup/rollback mechanism and zero-downtime PM2 reload