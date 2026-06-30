# Journal

Session log. Append entries with date and summary of changes made.

## 2026-06-30

- Created AGENTS.md with architecture, commands, and gotchas
- Created docs/ directory with memory.md, skills.md, journal.md
- Updated README.md to reference AGENTS.md
- Updated AGENTS.md to reference docs/ files
- Added `fill_jokes_batch` and `add_jokes` tools to code and README
- User communicates in Danish; prefers concise answers
- Added `server_status` tool
- Created `test_all.sh` with 11 tests (curl against localhost:5000/mcp)
- Created `docs/test.md` describing test setup
- Created frontend: `www/index.html` (vanilla JS, dark theme, category filter, search)
- Updated Express to serve static files via `express.static(WWW_DIR)`
- Added `clean_jokes` tool (remove null/empty entries)
- Added `add_joke` MCP tool + frontend textarea for custom jokes
- `cleanJokes()` runs auto on init and every saveJokes()
- Fixed joke parsing: split on `\n(?=\d+\. )` instead of `\n\n` (knock-knock joke with `\n\n` inside was fragmenting into 3 topics)
- Fixed multi-line joke display: `white-space: pre-wrap` instead of `<br>` hack
- Fixed category regex: "chuck" rule had wrong regex matching "dad" keywords
- Fixed `get_random_joke` try-catch (was crashing on total API outage)
- Refactored `tools/call` from if/else chain to lookup object pattern (handlers map)
- Created `start.sh` and `stop.sh` scripts
- Added `test_status.json` fixture
- Created `oc.md` to document frontend rendering bug (fixed)
- Updated all docs (README, AGENTS, skills, memory) with lookup pattern
