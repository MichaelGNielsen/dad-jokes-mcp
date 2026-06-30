# Tests

## test_all.sh

Automated test suite that runs all tools via curl against `localhost:5000/mcp`.

```bash
./test_all.sh
```

Tests every tool and reports pass/fail:

| Test | What it checks |
|---|---|
| `initialize` | Server returns `serverInfo` |
| `tools/list` | Response includes `server_status` tool |
| `get_random_joke` | Returns `"text"` content field |
| `get_multiple_jokes` | Returns `"Dad Jokes"` in message |
| `server_status` | Returns `jokeSources` field |
| `get_all_jokes` | Returns `"text"` content field |
| `get_joke_category` | Returns `"text"` content field |
| `fill_jokes_batch` | Returns `"Dad Jokes"` in message |
| `add_jokes` | Returns `"Added"` in message |

## JSON fixtures

Individual curl-ready request bodies:

| File | Method | Tool |
|---|---|---|
| `test.json` | `initialize` | — |
| `test_call.json` | `tools/call` | `get_random_joke` |
| `test_status.json` | `tools/call` | `server_status` |

```bash
curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d @test.json
curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d @test_call.json
```

## Gotchas

- Requires a running server on `localhost:5000`. Run `./start.sh` first.
- `get_random_joke` can fail if all 9 external joke APIs are unreachable (3 retries each). The test expects `"text"` in the response, so it will fail on total outage — but the tool now returns a proper error message instead of crashing.
