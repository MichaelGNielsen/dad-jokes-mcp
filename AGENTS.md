# Dad Jokes MCP — Agent Guide

> **Internal docs:** [`docs/memory.md`](docs/memory.md) (persistent context), [`docs/skills.md`](docs/skills.md) (learned patterns), [`docs/journal.md`](docs/journal.md) (session log). Read memory and journal before starting work; update them when you learn something.

## Quick start
```bash
npm install                    # install express 5 + @modelcontextprotocol/sdk
npm run dev                    # node --watch for hot reload
docker compose up -d           # or run in Docker
```

## Architecture

Single-file app: `dad_jokes_mcp.mjs` (~400 lines, Express 5 + native `fetch`).

- **MCP transport**: Streamable HTTP (NOT SSE). Endpoint: `POST /mcp`, JSON-RPC 2.0.
- **Storage**: `www/jokes.json` (Docker volume: `./www:/app/www`). Persisted on every mutation.
- **Joke sources**: 9 external APIs defined in `JOKE_SOURCES`. Randomly selected per fetch. Three retries with 1s delay.
- **Deduplication**: `allJokes.includes(joke)` check before inserting (unshift). Not perfect across APIs.

## Adding a new tool

Must edit **two places** in `dad_jokes_mcp.mjs`:

1. **`tools/list`** — add entry to the `tools` array with `name`, `description`, `inputSchema`
2. **`tools/call`** — add `else if (name === "your_tool")` branch in the if/else chain

No restart needed with `npm run dev` (file watch).

## Commands

| Command | What |
|---|---|
| `npm start` | Production start |
| `npm run dev` | Dev with `--watch` auto-restart |
| `docker compose up -d` | Docker (port 5000) |
| `docker compose build` | Rebuild image |

## Testing

No test framework. Use the test suite script:

```bash
./test_all.sh       # runs all tools via curl against localhost:5000
```

Or manual tests via curl with JSON fixture files:
- `test.json` — initialize request
- `test_call.json` — `tools/call get_random_joke`
- `test_status.json` — `tools/call server_status`

```bash
curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d @test.json
curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d @test_call.json
```

## Gotchas

- No lockfile committed. Run `npm install` before first `docker compose build` or the build will fail on missing packages.
- No lint, typecheck, or formatter config exists. Don't expect them.
- Port defaults to 5000, overridable via `PORT` env var.
- Hardcoded `/app/www` path — must match Docker `WORKDIR`.
- Session ID is generated per-request but not used for state tracking.
