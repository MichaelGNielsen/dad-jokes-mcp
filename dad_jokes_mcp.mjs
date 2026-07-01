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
const CONFIG_FILE = path.join(WWW_DIR, "config.json");

// In-memory storage for jokes
let allJokes = [];
let aiGatewayUrl = "http://nuc5:4042/v1/chat/completions";
let aiModel = "default";

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

// Remove null/empty/test entries and duplicates
function cleanJokes() {
  const before = allJokes.length;
  const seen = new Set();
  allJokes = allJokes.filter(j => {
    if (!j) return false;
    const text = typeof j === "string" ? j : j.text;
    if (!text || typeof text !== "string" || !text.trim()) return false;
    if (text.includes("Test joke from CI")) return false;

    const normalized = text.trim().toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);

    return true;
  });
  if (allJokes.length < before) {
    console.log(`🧹 Cleaned ${before - allJokes.length} entries (pool: ${allJokes.length})`);
  }
}

// Initialize
async function init() {
  await fs.mkdir(WWW_DIR, { recursive: true });

  // Load config
  try {
    const configData = await fs.readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(configData);
    if (config.aiGatewayUrl) aiGatewayUrl = config.aiGatewayUrl;
    if (config.aiModel) aiModel = config.aiModel;
    console.log(`✓ Loaded AI config: ${aiModel} @ ${aiGatewayUrl}`);
  } catch (err) {
    console.log("✓ No config file found, using defaults");
  }

  try {
    const data = await fs.readFile(JOKES_FILE, "utf-8");
    const parsed = JSON.parse(data);
    allJokes = parsed.map(j => {
      if (typeof j === "string") {
        return { heading: "Dad Joke", text: j };
      }
      return j;
    });
    const before = allJokes.length;
    cleanJokes();
    if (allJokes.length < before) {
      await saveJokes();
    }
    console.log(`✓ Loaded ${allJokes.length} jokes from file`);

    // Proactive heading generation for existing jokes with default heading
    setTimeout(async () => {
      let changed = false;
      for (let j of allJokes) {
        if (j.heading === "Dad Joke") {
          let newHeading = await generateHeading(j.text);
          if (newHeading === "Dad Joke" && j.text.includes("En mand kommer ind på en bar")) {
            newHeading = "En bar-vittighed";
          }
          if (newHeading !== "Dad Joke") {
            j.heading = newHeading;
            changed = true;
          }
          if (changed) await saveJokes(); 
        }
      }
    }, 1000);
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

// Save config to file
async function saveConfig() {
  try {
    const config = { aiGatewayUrl, aiModel };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("✗ Error saving config:", err);
  }
}

// Generate heading using AI
async function generateHeading(text) {
  try {
    const response = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: "You are a joke heading generator. Provide a short, catchy heading (2-5 words) for the joke provided. Only output the heading, nothing else." },
          { role: "user", content: text }
        ]
      })
    });
    if (!response.ok) throw new Error(`AI Gateway returned ${response.status}`);
    const data = await response.json();
    const heading = data.choices[0].message.content.trim().replace(/^"|"$/g, "");
    if (heading.includes("Error") || heading.length > 50) throw new Error("AI returned error or too long");
    return heading;
  } catch (err) {
    console.error("✗ Error generating heading:", err.message);
    return "Dad Joke";
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
      } else if (randomSource.includes("jokeapi.dev") || randomSource.includes("sv443.net")) {
        return data.type === "twopart" ? `${data.setup} ${data.delivery}` : data.joke;
      } else if (randomSource.includes("api.chucknorris.io")) {
        return data.value;
      } else if (randomSource.includes("icanhazdadjoke.com")) {
        return data.joke;
      } else if (randomSource.includes("geek-jokes.sameerkumar.website")) {
        return typeof data === "string" ? data : data.joke;
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
              description: "Remove null/empty entries and duplicate jokes from the pool.",
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
                  heading: {
                    type: "string",
                    description: "Optional heading for the joke",
                  },
                },
                required: ["text"],
              },
            },
            {
              name: "set_ai_gateway",
              description: "Set the AI Gateway URL for generating headings.",
              inputSchema: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    description: "The AI Gateway URL",
                  },
                },
                required: ["url"],
              },
            },
            {
              name: "list_ai_models",
              description: "List available models from the AI Gateway.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "set_ai_model",
              description: "Set the AI model to use for generating headings.",
              inputSchema: {
                type: "object",
                properties: {
                  model: {
                    type: "string",
                    description: "The model ID (e.g., 'llama3', 'gpt-4o-mini')",
                  },
                },
                required: ["model"],
              },
            },
            {
              name: "delete_joke",
              description: "Delete a specific joke by its text content.",
              inputSchema: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "The exact text of the joke to delete",
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
            const text = await fetchRandomJoke();
            if (!allJokes.some(j => j.text === text)) {
              const heading = await generateHeading(text);
              allJokes.unshift({ heading, text });
              await saveJokes();
              return { content: [{ type: "text", text: `😄 **${heading}**\n\n${text}` }] };
            }
            const existing = allJokes.find(j => j.text === text);
            return { content: [{ type: "text", text: `😄 **${existing.heading}**\n\n${existing.text}` }] };
          } catch (err) {
            return { content: [{ type: "text", text: `Failed to fetch joke: ${err.message}` }], isError: true };
          }
        },

        get_multiple_jokes: async () => {
          const count = Math.min(args.count || 5, 20);
          const jokes = [];
          for (let i = 0; i < count; i++) {
            try {
              const text = await fetchRandomJoke();
              if (!allJokes.some(j => j.text === text)) {
                const heading = await generateHeading(text);
                const jokeObj = { heading, text };
                allJokes.unshift(jokeObj);
                jokes.push(jokeObj);
              } else {
                jokes.push(allJokes.find(j => j.text === text));
              }
            } catch (err) {
              console.error(`Error fetching joke ${i + 1}:`, err);
            }
          }
          await saveJokes();
          let msg = `😄 ${jokes.length} Dad Jokes:\n\n`;
          jokes.forEach((j, i) => { msg += `${i + 1}. **${j.heading}**\n${j.text}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },

        server_status: async () => {
          let resolvedModel = aiModel;
          if (aiModel === "default") {
            try {
              const statusUrl = aiGatewayUrl.replace("/v1/chat/completions", "/api/status");
              const resp = await fetch(statusUrl);
              if (resp.ok) {
                const status = await resp.json();
                resolvedModel = `default (${status.active_model})`;
              }
            } catch (err) {
              resolvedModel = "default (unknown)";
            }
          }
          return {
            content: [{ type: "text", text: JSON.stringify({
              server: "dad-jokes-mcp", version: "1.0.0",
              protocol: "MCP 2024-11-05 (Streamable HTTP)",
              jokeSources: JOKE_SOURCES.length, storedJokes: allJokes.length, tools: 13,
              aiGatewayUrl, aiModel: resolvedModel
            }, null, 2) }],
          };
        },

        get_all_jokes: async () => {
          if (allJokes.length === 0) {
            return { content: [{ type: "text", text: "No jokes saved yet. Get some with get_random_joke!" }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(allJokes, null, 2) }] };
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
          return { content: [{ type: "text", text: `🧹 Removed ${before - allJokes.length} null/empty/test/duplicate entries (pool: ${allJokes.length})` }] };
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
            const text = category === "Chuck Norris" ? data.value : data.joke;
            let jokeObj;
            if (!allJokes.some(j => j.text === text)) {
              const heading = await generateHeading(text);
              jokeObj = { heading, text };
              allJokes.unshift(jokeObj);
              await saveJokes();
            } else {
              jokeObj = allJokes.find(j => j.text === text);
            }
            return { content: [{ type: "text", text: `😄 **${jokeObj.heading}** (${category} Joke):\n\n${jokeObj.text}` }] };
          } catch (err) {
            return { content: [{ type: "text", text: `Error fetching ${category} joke: ${err.message}` }], isError: true };
          }
        },

        add_jokes: async () => {
          const target = Math.min(args.count || 5, 20);
          const added = [];
          for (let i = 0; i < target; i++) {
            try {
              const text = await fetchRandomJoke();
              if (!allJokes.some(j => j.text === text)) {
                const heading = await generateHeading(text);
                const jokeObj = { heading, text };
                allJokes.unshift(jokeObj);
                added.push(jokeObj);
              }
            } catch (err) { console.error(`Error fetching joke ${i + 1}:`, err); }
          }
          await saveJokes();
          let msg = `➕ Added ${added.length} new joke(s) to pool (total: ${allJokes.length}):\n\n`;
          added.forEach((j, i) => { msg += `${i + 1}. **${j.heading}**\n${j.text}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },

        add_joke: async () => {
          const text = args.text;
          const heading = args.heading || await generateHeading(text);
          if (!text || !text.trim()) {
            return { content: [{ type: "text", text: "Joke text is required" }], isError: true };
          }
          if (allJokes.some(j => j.text === text.trim())) {
            return { content: [{ type: "text", text: "That joke already exists in the pool!" }] };
          }
          allJokes.unshift({ heading: heading.trim(), text: text.trim() });
          await saveJokes();
          return { content: [{ type: "text", text: `➕ Added joke: **${heading}** (pool: ${allJokes.length})` }] };
        },

        fill_jokes_batch: async () => {
          const target = Math.min(args.count || 5, 20);
          const needed = target - allJokes.length;
          if (needed > 0) {
            console.log(`→ Fetching ${needed} joke(s) to reach batch size ${target}`);
            for (let i = 0; i < needed; i++) {
              try {
                const text = await fetchRandomJoke();
                if (!allJokes.some(j => j.text === text)) {
                  const heading = await generateHeading(text);
                  allJokes.unshift({ heading, text });
                }
              } catch (err) { console.error(`Error fetching joke ${i + 1}:`, err); }
            }
            await saveJokes();
          }
          const batch = allJokes.slice(0, target);
          let msg = `📦 ${batch.length} Dad Jokes (pool: ${allJokes.length}):\n\n`;
          batch.forEach((j, i) => { msg += `${i + 1}. **${j.heading}**\n${j.text}\n\n`; });
          return { content: [{ type: "text", text: msg.trim() }] };
        },

        set_ai_gateway: async () => {
          aiGatewayUrl = args.url;
          await saveConfig();
          return { content: [{ type: "text", text: `✅ AI Gateway URL set to: ${aiGatewayUrl} (saved)` }] };
        },
        list_ai_models: async () => {
          try {
            const modelsUrl = aiGatewayUrl.replace("/v1/chat/completions", "/v1/models");
            const resp = await fetch(modelsUrl);
            if (!resp.ok) throw new Error(`Gateway returned ${resp.status}`);
            const data = await resp.json();
            const models = data.data.map(m => m.id);
            return { content: [{ type: "text", text: `Available models:\n- ${models.join("\n- ")}` }] };
          } catch (err) {
            return { content: [{ type: "text", text: `Error fetching models: ${err.message}` }], isError: true };
          }
        },
        set_ai_model: async () => {
          aiModel = args.model;
          await saveConfig();
          return { content: [{ type: "text", text: `✅ AI Model set to: ${aiModel} (saved)` }] };
        },
        delete_joke: async () => {
          const text = args.text;
          const before = allJokes.length;
          allJokes = allJokes.filter(j => j.text !== text);
          if (allJokes.length < before) {
            await saveJokes();
            return { content: [{ type: "text", text: `🗑 Deleted joke (pool: ${allJokes.length})` }] };
          }
          return { content: [{ type: "text", text: "Joke not found" }], isError: true };
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

  // Daily auto-fetch: 5 jokes every 24 hours
  setInterval(async () => {
    console.log("🕒 Running scheduled daily fetch (5 jokes)...");
    try {
      const added = [];
      for (let i = 0; i < 5; i++) {
        const text = await fetchRandomJoke();
        if (!allJokes.some(j => j.text === text)) {
          const heading = await generateHeading(text);
          const jokeObj = { heading, text };
          allJokes.unshift(jokeObj);
          added.push(jokeObj);
        }
      }
      if (added.length > 0) {
        await saveJokes();
        console.log(`✅ Scheduled fetch complete: Added ${added.length} new jokes.`);
      } else {
        console.log("ℹ️ Scheduled fetch complete: No new unique jokes found.");
      }
    } catch (err) {
      console.error("✗ Error during scheduled fetch:", err.message);
    }
  }, 24 * 60 * 60 * 1000);
});
