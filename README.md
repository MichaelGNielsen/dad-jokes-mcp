# Dad Jokes MCP Server

A Model Context Protocol (MCP) server that fetches and manages dad jokes via Streamable HTTP transport. Jokes are automatically saved to persistent storage.

## Features

- 🎯 **Streamable HTTP Transport** - Uses MCP 2024-11-05 protocol
- 💾 **Persistent Storage** - Jokes automatically saved to `www/jokes.json`
- 😄 **Multiple Joke Sources** - Fetches from 9+ joke APIs
- 🐳 **Docker Ready** - Full Docker setup with volume mounts
- 🔧 **5 Tools**:
  - `get_random_joke` - Fetch a random dad joke and save it
  - `get_multiple_jokes` - Fetch multiple jokes at once
  - `get_all_jokes` - View all saved jokes
  - `clear_jokes` - Clear saved jokes
  - `get_joke_category` - Get jokes by category (Programming, Knock-knock, General, Chuck Norris)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker

```bash
docker compose up -d
```

The server will start on `http://localhost:5000/mcp`

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

## Supported Joke Categories

- **Programming** - Tech & programming jokes
- **Knock-knock** - Classic knock-knock jokes
- **General** - General humor
- **Chuck Norris** - Chuck Norris jokes

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
