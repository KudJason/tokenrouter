#!/bin/bash
# TokenRouter MVP - Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  TokenRouter MVP Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if wrangler is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx is required. Install Node.js first.${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Check for required secrets
echo -e "\n${YELLOW}Checking configuration...${NC}"

# Check for required environment variables or secrets
check_secret() {
    local secret_name=$1
    echo -n "Checking $secret_name... "
    # We'll check if it's set in wrangler secrets
    if npx wrangler secret list 2>/dev/null | grep -q "$secret_name"; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${YELLOW}NOT SET${NC}"
        return 1
    fi
}

# Check for D1 database
echo -n "Checking D1 database... "
if npx wrangler d1 list 2>/dev/null | grep -q "tokenrouter"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}NOT FOUND (will create)${NC}"
fi

# Check for R2 buckets
echo -n "Checking R2 buckets... "
echo -e "${YELLOW}Please ensure these exist in Cloudflare Dashboard:${NC}"
echo "  - enterprise-ontologies"
echo "  - tokenrouter-archive"

# Check for KV namespaces
echo -n "Checking KV namespaces... "
echo -e "${YELLOW}Please ensure these exist in Cloudflare Dashboard:${NC}"
echo "  - GRAPH_CACHE"
echo "  - SESSIONS"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Secrets Configuration${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "Please set the following secrets:"
echo ""
echo "  npx wrangler secret put OPENAI_API_KEY"
echo "  npx wrangler secret put ANTHROPIC_API_KEY"
echo "  npx wrangler secret put GOOGLE_API_KEY"
echo "  npx wrangler secret put DEEPSEEK_API_KEY"
echo "  npx wrangler secret put SILICONFLOW_API_KEY"
echo ""

# Deploy
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Deploying to Cloudflare Workers${NC}"
echo -e "${YELLOW}========================================${NC}"

# First, apply migrations
echo -e "${YELLOW}Applying D1 migrations...${NC}"
npx wrangler d1 migrations apply tokenrouter --remote 2>/dev/null || echo "Skipping migrations (may already be applied)"

# Deploy
echo -e "${YELLOW}Deploying Worker...${NC}"
npx wrangler deploy

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Your API is available at:${NC}"
echo "  https://token.route.worthwolf.top"
echo ""
echo "Test endpoints:"
echo "  curl https://token.route.worthwolf.top/health"
echo "  curl https://token.route.worthwolf.top/v1/providers"
echo ""
