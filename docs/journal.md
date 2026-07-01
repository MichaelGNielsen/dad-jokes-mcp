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
- Tilføjet `list_ai_models` og `set_ai_model` tools.
- Opdateret `generateHeading` til at bruge en konfigurerbar model.
- Opdateret `cleanJokes` til også at fjerne "Test joke from CI" jokes.
- Opdateret `clean_jokes` tool-handler med ny statusbesked.
- Rebuilt Docker image og bekræftet fjernelse af 5 test-jokes fra `jokes.json`.
- Tilføjet `delete_joke` tool til MCP serveren for at tillade manuel sletning af specifikke jokes.
- Opdateret Web UI med et "×" ikon på hver joke til manuel sletning.
- Tilføjet `www/config.json` med `qwen3.6` som standard model for at undgå `thought_signature` fejl.
- Implementeret en daglig baggrunds-opgave, der automatisk henter 5 nye jokes hver 24. time.

