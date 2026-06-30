#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
docker compose up -d --build
echo "✓ Dad Jokes MCP running at http://localhost:5000/mcp"
