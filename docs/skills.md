# Skills

Learned patterns and reusable approaches for this project. Add entries as you discover useful patterns.

## Adding a tool

Two edits in `dad_jokes_mcp.mjs`:
1. Add entry to `tools` array in `tools/list`
2. Add `else if (name === "...")` branch in `tools/call`

## Existing tools

| Tool | Purpose |
|---|---|
| `get_random_joke` | Fetch & save one random joke |
| `get_multiple_jokes` | Fetch N fresh jokes (always fetches) |
| `server_status` | Show version, sources, stored count, tools count |
| `get_all_jokes` | List all stored jokes |
| `clear_jokes` | Delete all stored jokes |
| `get_joke_category` | Fetch from specific category |
| `fill_jokes_batch` | Ensure pool has N jokes; fetch only if needed |
| `add_jokes` | Fetch & store N new jokes unconditionally |
| `add_joke` | Add a custom joke manually |
| `clean_jokes` | Remove null/empty entries from pool |

## Project conventions

- Single-file app, no framework beyond Express
- Jokes deduplicated with `allJokes.includes()` before `unshift`
- 3 retries with 1s delay on failed API fetches
- All mutations persist to `www/jokes.json` immediately
