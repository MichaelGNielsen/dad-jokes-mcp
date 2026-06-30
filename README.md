> **Agent instructions:** See [`AGENTS.md`](AGENTS.md) for architecture, commands, and how to add tools.

## Available Tools

| Tool Name | Description | Input | Output | Example | curl |
|-----------|-------------|-------|--------|----------|------|
| `get_random_joke` | Fetch a random dad joke and save it | None | Joke text | `@dad-jokes-mcp get_random_joke` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_random_joke","arguments":{}}}'` |
| `get_multiple_jokes` | Fetch multiple random dad jokes at once | `count` (1-20, default: 5) | Array of jokes | `@dad-jokes-mcp get_multiple_jokes count=10` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_multiple_jokes","arguments":{"count":10}}}'` |
| `server_status` | Show server version, sources count, stored jokes, tools | None | JSON status | `@dad-jokes-mcp server_status` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"server_status","arguments":{}}}'` |
| `get_all_jokes` | View all jokes stored in www/jokes.json | None | All saved jokes | `@dad-jokes-mcp get_all_jokes` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_all_jokes","arguments":{}}}'` |
| `clear_jokes` | Delete all saved jokes | None | Confirmation | `@dad-jokes-mcp clear_jokes` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"clear_jokes","arguments":{}}}'` |
| `get_joke_category` | Get joke from category | `category` (enum) | Joke from category | `@dad-jokes-mcp get_joke_category category=Programming` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_joke_category","arguments":{"category":"Programming"}}}'` |
| `fill_jokes_batch` | Ensure at least N jokes are stored; fetches if needed | `count` (1-20, default: 5) | N jokes from pool | `@dad-jokes-mcp fill_jokes_batch count=10` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fill_jokes_batch","arguments":{"count":10}}}'` |
| `add_jokes` | Fetch and store N new jokes unconditionally | `count` (1-20, default: 5) | N new jokes added | `@dad-jokes-mcp add_jokes count=10` | `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add_jokes","arguments":{"count":10}}}'` |

## How MCP Tool Routing Works

### The Short Answer

Nej, det er **ikke hardkodet**. Det er **dynamisk routing** baseret på tool-navn.

### Hvad der sker når du skriver:

```
@dad-jokes-mcp get_multiple_jokes count=10
```

**Step 1: PA parser din besked**
- PA ser `@dad-jokes-mcp` = server navn
- PA ser `get_multiple_jokes` = tool navn
- PA ser `count=10` = argument

**Step 2: PA laver en JSON-RPC request**

```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "method": "tools/call",
  "params": {
    "name": "get_multiple_jokes",
    "arguments": {
      "count": 10
    }
  }
}
```

**Step 3: MCP Server modtager request**

Serveren (dad_jokes_mcp.mjs) modtager JSON via POST `/mcp`:

```javascript
if (request.method === "tools/call") {
  const { name, arguments: args } = request.params;
  
  // name = "get_multiple_jokes"
  // args = { count: 10 }
  
  if (name === "get_multiple_jokes") {
    const count = Math.min(args.count || 5, 20);
    // ... fetch 10 jokes ...
  }
}
```

**Step 4: Server matcher tool-navn og udfører**

Serveren bruger en `if/else` chain til at matche tool-navn:

```javascript
if (name === "get_random_joke") {
  // Execute get_random_joke
} else if (name === "get_multiple_jokes") {
  // Execute get_multiple_jokes ← MATCH!
} else if (name === "get_all_jokes") {
  // Execute get_all_jokes
} else if (name === "clear_jokes") {
  // Execute clear_jokes
} else if (name === "get_joke_category") {
  // Execute get_joke_category
} else if (name === "fill_jokes_batch") {
  // Execute fill_jokes_batch
} else if (name === "add_jokes") {
  // Execute add_jokes
}
```

**Step 5: Server returnerer resultat**

```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "😄 10 Dad Jokes:\n\n1. ...\n2. ..."
      }
    ]
  }
}
```

**Step 6: PA viser resultatet**

PA modtager resultatet og viser det for brugeren.

### Hvorfor er det ikke hardkodet?

1. **Tool-navne er defineret dynamisk** - I `tools/list` metoden returnerer serveren hvilke tools der findes
2. **Arguments er dynamiske** - Hver tool kan have forskellige inputs
3. **Routing er baseret på string matching** - `if (name === "tool_name")` matcher kun hvis navn passer

### Hvis du tilføjede en ny tool

Du skulle:

1. Tilføje den til `tools/list` response:
```javascript
{
  name: "my_new_tool",
  description: "What it does",
  inputSchema: { /* ... */ }
}
```

2. Tilføje handling i `tools/call`:
```javascript
else if (name === "my_new_tool") {
  // Do something
  toolResponse = { content: [{ type: "text", text: "Result" }] };
}
```

3. PA ville automatisk detektere den næste gang den kalder `tools/list`!

### MCP Protocol Flow

```
PA Client                          MCP Server (dad_jokes_mcp.js)
   │                                        │
   ├─ POST /mcp (initialize) ───────────────┤
   │                                        │
   │ ◄──── { serverInfo, capabilities } ────┤
   │                                        │
   ├─ POST /mcp (tools/list) ───────────────┤
   │                                        │
   │ ◄──── { tools: [...] } ────────────────┤
   │                                        │
   ├─ POST /mcp (tools/call) ───────────────┤
   │   { name: "get_multiple_jokes", ... }  │
   │                                        │
   │ ◄──── { result: { content: [...] } } ──┤
   │                                        │
```

## API Details

### MCP Endpoint: `/mcp`

**Method:** `POST`

**Headers:**
- `Content-Type: application/json`
- `Mcp-Session-Id` (response header - auto-generated)

**Request Format:** JSON-RPC 2.0

Example request body for calling a tool:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_random_joke",
    "arguments": {}
  }
}
```

# Dad Jokes MCP Server

A Model Context Protocol (MCP) server that fetches and manages dad jokes via Streamable HTTP transport. Jokes are automatically saved to persistent storage.

## Features

- 🎯 **Streamable HTTP Transport** - Uses MCP 2024-11-05 protocol
- 💾 **Persistent Storage** - Jokes automatically saved to `www/jokes.json`
- 😄 **Multiple Joke Sources** - Fetches from 9+ joke APIs
- 🐳 **Docker Ready** - Full Docker setup with volume mounts
- 🔧 **8 Tools**:
  - `get_random_joke` - Fetch a random dad joke and save it
  - `get_multiple_jokes` - Fetch multiple jokes at once
  - `server_status` - View server status, version, and stats
  - `get_all_jokes` - View all saved jokes
  - `clear_jokes` - Clear saved jokes
  - `get_joke_category` - Get jokes by category (Programming, Knock-knock, General, Chuck Norris)
  - `fill_jokes_batch` - Ensure at least N jokes are stored
  - `add_jokes` - Fetch and store N new jokes

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker

```bash
docker compose up -d
```

The server will start on `http://localhost:5000/` (frontend) with MCP endpoint at `/mcp`

### MCP Configuration

Add to your MCP client config (Gemini, Page Assist, etc):

```json
{
  "mcp": {
    "servers": {
      "dad-jokes": {
        "url": "http://localhost:5000/mcp"
      }
    }
  }
}
```

## Testing

See [`docs/test.md`](docs/test.md) for the full test suite, JSON fixtures, and gotchas.

### Test with curl

```bash
# Initialize
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# List tools
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get a random joke
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_random_joke","arguments":{}}}'
```

## Project Structure

```
dad-jokes-mcp/
├── dad_jokes_mcp.mjs        # Main server code
├── package.json             # Node.js dependencies
├── Dockerfile               # Docker image definition
├── docker-compose.yml       # Docker Compose config
├── .dockerignore            # Docker build exclusions
├── www/
│   └── jokes.json           # Persistent jokes storage
└── .git/                    # Git repository
```

## Jokes Storage

Jokes are automatically saved to `www/jokes.json` with the following structure:

```json
[
  "Chuck Norris can understand women.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "..."
]
```

The file persists across container restarts due to Docker volume mounting.

## API Details

### MCP Endpoint: `/mcp`

**Method:** `POST`

**Headers:**

- `Content-Type: application/json`
- `Mcp-Session-Id` (response header - auto-generated)

**Request Format:** JSON-RPC 2.0

Example request body for calling a tool:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_random_joke",
    "arguments": {}
  }
}
```

## Environment Variables

- `PORT` - Server port (default: 5000)

## Docker Volumes

- `./www:/app/www` - Mounts local `www/` directory for persistent joke storage



## Development

### Local Development (without Docker)

```bash
npm install
PORT=5000 node dad_jokes_mcp.mjs
```

### Build Docker Image

```bash
docker compose build
```

### View Logs

```bash
docker logs dad-jokes-mcp-server -f
```

## Troubleshooting

### MCP Validation Failed

If you see "Legacy MCP SSE endpoints are not supported", ensure your MCP client is configured to use the Streamable HTTP endpoint:

```
http://localhost:5000/mcp  ✓ Correct
http://localhost:5000/sse  ✗ Deprecated (SSE)
```

### No Jokes Saved

- Check Docker volume mount: `docker compose config | grep volumes`
- Verify `www/` directory exists: `ls -la www/`
- Check container logs: `docker logs dad-jokes-mcp-server`

### API Connection Issues

- Ensure server is running: `curl http://localhost:5000/`
- Check port availability: `netstat -an | grep 5000`
- Verify firewall allows port 5000

## Performance

- Joke fetching: ~1-3 seconds (with retries)
- JSON parsing: <100ms
- File I/O: ~50-200ms depending on disk speed

## License

MIT

## Author

Michael G. Nielsen

---

**Dad jokes duh** 😄
