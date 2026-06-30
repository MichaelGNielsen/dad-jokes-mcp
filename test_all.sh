#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:5000/mcp"
PASS=0
FAIL=0

test() {
  local name="$1" json="$2" expect="$3"
  local out
  out=$(curl -s -X POST "$BASE" -H "Content-Type: application/json" -d "$json")
  if echo "$out" | grep -q "$expect"; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name (expected '$expect')"
    echo "    got: $out"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Dad Jokes MCP — Test Suite ==="
echo ""

test "initialize" \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  '"serverInfo"'

test "tools/list" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  'server_status'

test "get_random_joke" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_random_joke","arguments":{}}}' \
  '"text"'

test "get_multiple_jokes" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_multiple_jokes","arguments":{"count":3}}}' \
  'Dad Jokes'

test "server_status" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"server_status","arguments":{}}}' \
  'jokeSources'

test "get_all_jokes" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_all_jokes","arguments":{}}}' \
  '"text"'

test "get_joke_category" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_joke_category","arguments":{"category":"Programming"}}}' \
  '"text"'

test "fill_jokes_batch" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fill_jokes_batch","arguments":{"count":5}}}' \
  'Dad Jokes'

test "add_jokes" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add_jokes","arguments":{"count":3}}}' \
  'Added'

test "add_joke" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add_joke","arguments":{"text":"Test joke from CI"}}}' \
  'Added'

test "clean_jokes" \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"clean_jokes","arguments":{}}}' \
  'Removed'

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
