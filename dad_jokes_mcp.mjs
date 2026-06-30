import express from "express";
import fs from "fs/promises";
import path from "path";

/**
 * Dad Jokes MCP Server (Streamable HTTP version)
 * Saves jokes to www/jokes.json
 */

// Paths
const WWW_DIR = "/app/www";
const JOKES_FILE = path.join(WWW_DIR, "jokes.json");

// In-memory storage for jokes
let allJokes = [];

// List of joke APIs
const JOKE_SOURCES = [
  "https://official-joke-api.appspot.com/random_joke",
  "https://v2.jokeapi.dev/joke/Programming?type=single",
  "https://sv443.net/jokeapi/v2/joke/Any",
  "https://api.chucknorris.io/jokes/random",
  "https://icanhazdadjoke.com/",
  "https://geek-jokes.sameerkumar.website/api",
  "https://api.yomomma.info/",
  "https://jokeapi.dev/api/joke/Any",
  "https://api.jokes.one/jod",
];

// Remove null/empty entries
function cleanJokes() {
  const before = allJokes.length;
  allJokes = allJokes.filter(j => j && typeof j === "string" && j.trim());
  if (allJokes.length < before) {
    console.log(`🧹 Cleaned ${before - allJokes.length} null/empty entries`);
  }
}

// Initialize
async function init() {
  await fs.mkdir(WWW_DIR, { recursive: true });
  try {
    const data = await fs.readFile(JOKES_FILE, "utf-8");
    allJokes = JSON.parse(data);
    cleanJokes();
    console.log(`✓ Loaded ${allJokes.length} jokes from file`);
  } catch (err) {
    console.log("✓ Starting fresh with no jokes");
    allJokes = [];
  }
}

// Save jokes to file
async function saveJokes() {
  cleanJokes();
  try {
    await fs.writeFile(JOKES_FILE, JSON.stringify(allJokes, null, 2));
  } catch (err) {
    console.error("✗ Error saving jokes:", err);
  }
}

// Fetch a random joke
async function fetchRandomJoke() {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    const randomSource =
      JOKE_SOURCES[Math.floor(Math.random() * JOKE_SOURCES.length)];

    try {
      const response = await fetch(randomSource, { timeout: 5000 });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();

      if (randomSource.includes("official-joke-api")) {
        return data.setup + " " + data.punchline;
      } else if (randomSource.includes("jokeapi.dev")) {
        return data.joke;
      } else if (randomSource.includes("sv443.net")) {
        return data.joke;
      } else if (randomSource.includes("api.chucknorris.io")) {
        return data.value;
      } else if (randomSource.includes("icanhazdadjoke.com")) {
        return data.joke;
      } else if (randomSource.includes("geek-jokes.sameerkumar.website")) {
        return data.joke;
      } else if (randomSource.includes("api.yomomma.info")) {
        return data.joke;
      } else if (randomSource.includes("api.jokes.one")) {
        return data.contents.jokes[0].joke.text;
      } else {
        throw new Error("Unknown API format");
      }
    } catch (error) {
      console.error(`✗ Error fetching from ${randomSource}:`, error.message);
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw new Error("Failed to fetch joke after retries");
}

// HTTP Server
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(WWW_DIR));

// Main MCP endpoint
app.post("/mcp", async (req, res) => {
  try {
    const request = req.body;

    if (!request || !request.method) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
      });
    }

    const sessionId = `session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    let response;

    if (request.method === "initialize") {
      response = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "dad-jokes-mcp",
            version: "1.0.0",
          },
        },
      };
    } else if (request.method === "tools/list") {
      response = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "get_random_joke",
              description:
                "Dad jokes duh - Fetch a random dad joke and save it to www/jokes.json",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "get_multiple_jokes",
              description: "Fetch multiple random dad jokes at once.",
              inputSchema: {
                type: "object",
                properties: {
                  count: {
                    type: "number",
                    description: "Number of jokes to fetch (default: 5, max: 20)",
                  },
                },
              },
            },
            {
              name: "server_status",
              description: "Show server version, number of joke sources, stored jokes count, and available tools.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "get_all_jokes",
              description: "Get all jokes stored in www/jokes.json",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "clear_jokes",
              description: "Clear all saved jokes.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "clean_jokes",
              description: "Remove null/empty entries from the joke pool.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "get_joke_category",
              description: "Fetch a joke from a specific category.",
              inputSchema: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: [
                      "Programming",
                      "Knock-knock",
                      "General",
                      "Chuck Norris",
                    ],
                    description: "Joke category",
                  },
                },
                required: ["category"],
              },
            },
            {
              name: "fill_jokes_batch",
              description:
                "Ensure at least N jokes are stored. Fetches new ones if needed, then returns them.",
              inputSchema: {
                type: "object",
                properties: {
                  count: {
                    type: "number",
                    description: "Desired number of jokes (default: 5, max: 20)",
                  },
                },
              },
            },
            {
              name: "add_jokes",
              description:
                "Fetch and store N new jokes, regardless of how many are already saved.",
              inputSchema: {
                type: "object",
                properties: {
                  count: {
                    type: "number",
                    description: "Number of new jokes to fetch and store (default: 5, max: 20)",
                  },
                },
              },
            },
            {
              name: "add_joke",
              description:
                "Add a custom joke to the pool manually.",
              inputSchema: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "The joke text to add",
                  },
                },
                required: ["text"],
              },
            },
          ],
        },
      };
    } else if (request.method === "tools/call") {
      const { name, arguments: args } = request.params;

      const handlers = {
        get_random_joke: async () => {
          try {
            const joke = await fetchRandomJoke();
            if (!allJokes.includes(joke)) {
              allJokes.unshift(joke);
              await saveJokes();
            }
            return { content: [{ type: "text", text: `😄 ${joke}` }] };
          } catch (err) {
            return { content: [{ type: "text", text: `Failed to fetch joke: ${err.message}` }], isError: true };
          }
        },

        get_multiple_jokes: async () => {
          const count = Math.min(args.count || 5, 20);
          const jokes = [];
          for (let i = 0; i < count; i++) {
            try {
              const joke = await fetchRandomJoke();
              jokes.push(joke);
              if (!allJokes.includes(joke)) allJokes.unshift(joke);
            } catch (err) {
              console.error(`Error fetching joke ${i + 1}:`, err);
            }
          }
          await saveJokes();
          let msg = `😄 ${jokes.length} Dad Jokes:\n\n`;
          jokes.forEach((joke, i) => { msg += `${i + 1}. ${joke}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },

        server_status: async () => ({
          content: [{ type: "text", text: JSON.stringify({
            server: "dad-jokes-mcp", version: "1.0.0",
            protocol: "MCP 2024-11-05 (Streamable HTTP)",
            jokeSources: JOKE_SOURCES.length, storedJokes: allJokes.length, tools: 10,
          }, null, 2) }],
        }),

        get_all_jokes: async () => {
          if (allJokes.length === 0) {
            return { content: [{ type: "text", text: "No jokes saved yet. Get some with get_random_joke!" }] };
          }
          let msg = `📝 ${allJokes.length} Saved Jokes:\n\n`;
          allJokes.forEach((joke, i) => { msg += `${i + 1}. ${joke}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },

        clear_jokes: async () => {
          const count = allJokes.length;
          allJokes = [];
          await saveJokes();
          return { content: [{ type: "text", text: `Cleared ${count} jokes from www/jokes.json` }] };
        },

        clean_jokes: async () => {
          const before = allJokes.length;
          cleanJokes();
          await saveJokes();
          return { content: [{ type: "text", text: `🧹 Removed ${before - allJokes.length} null/empty entries (pool: ${allJokes.length})` }] };
        },

        get_joke_category: async () => {
          const category = args.category;
          const urls = {
            "Programming": "https://v2.jokeapi.dev/joke/Programming?type=single",
            "Knock-knock": "https://v2.jokeapi.dev/joke/Knock-Knock?type=single",
            "General": "https://v2.jokeapi.dev/joke/General?type=single",
            "Chuck Norris": "https://api.chucknorris.io/jokes/random",
          };
          const url = urls[category];
          try {
            const resp = await fetch(url, { timeout: 5000 });
            if (!resp.ok) throw new Error(`API returned ${resp.status}`);
            const data = await resp.json();
            const joke = category === "Chuck Norris" ? data.value : data.joke;
            if (!allJokes.includes(joke)) { allJokes.unshift(joke); await saveJokes(); }
            return { content: [{ type: "text", text: `😄 ${category} Joke:\n\n${joke}` }] };
          } catch (err) {
            return { content: [{ type: "text", text: `Error fetching ${category} joke: ${err.message}` }], isError: true };
          }
        },

        add_jokes: async () => {
          const target = Math.min(args.count || 5, 20);
          let added = 0;
          for (let i = 0; i < target; i++) {
            try {
              const joke = await fetchRandomJoke();
              if (!allJokes.includes(joke)) { allJokes.unshift(joke); added++; }
            } catch (err) { console.error(`Error fetching joke ${i + 1}:`, err); }
          }
          await saveJokes();
          let msg = `➕ Added ${added} new joke(s) to pool (total: ${allJokes.length}):\n\n`;
          allJokes.slice(0, added).forEach((joke, i) => { msg += `${i + 1}. ${joke}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },

        add_joke: async () => {
          const text = args.text;
          if (!text || !text.trim()) {
            return { content: [{ type: "text", text: "Joke text is required" }], isError: true };
          }
          if (allJokes.includes(text.trim())) {
            return { content: [{ type: "text", text: "That joke already exists in the pool!" }] };
          }
          allJokes.unshift(text.trim());
          await saveJokes();
          return { content: [{ type: "text", text: `➕ Added joke (pool: ${allJokes.length})` }] };
        },

        fill_jokes_batch: async () => {
          const target = Math.min(args.count || 5, 20);
          const needed = target - allJokes.length;
          if (needed > 0) {
            console.log(`→ Fetching ${needed} joke(s) to reach batch size ${target}`);
            for (let i = 0; i < needed; i++) {
              try {
                const joke = await fetchRandomJoke();
                if (!allJokes.includes(joke)) allJokes.unshift(joke);
              } catch (err) { console.error(`Error fetching joke ${i + 1}:`, err); }
            }
            await saveJokes();
          }
          const batch = allJokes.slice(0, target);
          let msg = `📦 ${batch.length} Dad Jokes (pool: ${allJokes.length}):\n\n`;
          batch.forEach((joke, i) => { msg += `${i + 1}. ${joke}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },
      };

      const handler = handlers[name];
      let toolResponse;
      if (handler) {
        toolResponse = await handler(args);
      } else {
        toolResponse = { error: { code: -32601, message: `Tool not found: ${name}` } };
      }

      response = {
        jsonrpc: "2.0",
        id: request.id,
        result: toolResponse,
      };
    } else {
      response = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: "Method not found",
        },
      };
    }

    res.setHeader("Mcp-Session-Id", sessionId);
    res.setHeader("Content-Type", "application/json");
    res.json(response);
  } catch (err) {
    console.error("✗ Error in /mcp handler:", err);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
      },
    });
  }
});

const PORT = process.env.PORT || 5000;

// Start server after init
init().then(() => {
  const server_instance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`
🚀 Dad Jokes MCP Server (Streamable HTTP) running!
----------------------------------------------------
MCP endpoint:  http://0.0.0.0:${PORT}/mcp
Jokes file:    /app/www/jokes.json
Port:          ${PORT}
  `);
  });

  server_instance.on("error", (err) => {
    console.error("💥 SERVER ERROR:", err);
  });
});
