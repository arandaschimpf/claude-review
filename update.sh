#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment update...${NC}"

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to handle errors
handle_error() {
    log "${RED}Error: $1${NC}"
    exit 1
}

# Change to app directory
cd /app || handle_error "Could not change to /app directory"

# Backup current state
log "${YELLOW}Creating backup...${NC}"
cp -r dist dist.backup || handle_error "Could not create backup"

# Check if git repository is initialized
if [ ! -d ".git" ]; then
    log "${YELLOW}Initializing git repository...${NC}"
    git init || handle_error "Git init failed"
    git remote add origin ${REPO_URL:-https://github.com/arandaschimpf/claude-review.git} || handle_error "Adding remote failed"
    git config user.email "container@claude-review.local"
    git config user.name "Claude Review Container"
fi

# Pull latest changes
log "${YELLOW}Pulling latest changes from git...${NC}"
git fetch origin || handle_error "Git fetch failed"
git reset --hard origin/main || handle_error "Git reset failed"

# Install/update dependencies
log "${YELLOW}Installing dependencies...${NC}"
npm install || handle_error "npm install failed"

# Compile TypeScript
log "${YELLOW}Compiling TypeScript...${NC}"
npm run build || handle_error "TypeScript compilation failed"

# Test if the build was successful
if [ ! -f "dist/index.js" ]; then
    log "${RED}Build failed - dist/index.js not found${NC}"
    log "${YELLOW}Restoring backup...${NC}"
    rm -rf dist
    mv dist.backup dist
    handle_error "Build verification failed, backup restored"
fi

# Reload PM2 (zero-downtime restart)
log "${YELLOW}Reloading PM2...${NC}"
npx pm2 reload claude-review || handle_error "PM2 reload failed"

# Clean up backup
rm -rf dist.backup

log "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Application updated and restarted${NC}"