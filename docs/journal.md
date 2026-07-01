# Journal

Session log. Append entries with date and summary of changes made.

## 2026-07-01

- Opdateret datamodel til at inkludere `heading` for alle jokes.
- Implementeret AI-generering af overskrifter via gateway på `nuc5:4042`.
- Tilføjet automatisk migrering af eksisterende jokes til objekt-format.
- Tilføjet `set_ai_gateway` MCP-tool og opdateret `server_status` med AI URL.
- Opdateret Web UI til at vise overskrifter og tillade konfiguration af AI URL.
- Tilføjet proaktiv generering af overskrifter i baggrunden ved opstart.
- Fixet `fetchRandomJoke` til at håndtere to-parts jokes fra JokeAPI.
- Rebuilt Docker image for at anvende kodeændringer.

