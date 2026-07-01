# Memory

Persistent context across sessions. Update this file when you learn something about the project, user preferences, decisions made, or unresolved issues that should carry forward.

## Project

- Dad Jokes MCP server – single-file Express 5 app with Streamable HTTP MCP transport
- Owner / maintainer: Michael G. Nielsen
- Language: Danish (user communicates in Danish)

## Decisions

- Jokes stored as JSON array in `www/jokes.json` (not markdown, kept JSON)
- Frontend: vanilla HTML/CSS/JS served as static files from Express
- Category classification via simple keyword regex matching
- `tools/call` uses lookup object pattern (not if/else chain)
- `cleanJokes()` auto-runs on init and before every save – now also removes "Test joke from CI" entries

## Known issues

- Dedup `allJokes.includes()` is naive – same joke from different APIs won't match
- Session ID is generated per-request but not used for state tracking
- `/app/www` path is hardcoded – must match Docker WORKDIR

## Preferences

- User prefers concise answers, minimal explanation
- User communicates in Danish
- Prefer Docker for running the server
