import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

/**
 * Dad Jokes MCP Server (Streamable HTTP version)
 * Uses the new MCP Streamable HTTP transport
 */

const server = new Server(
  {
    name: "dad-jokes-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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

// In-memory storage for favorites
let favoriteJokes = [];

// Helper function to fetch a random joke
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
      console.error(`Error fetching from ${randomSource}:`, error.message);
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error("Failed to fetch joke after retries");
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_random_joke",
        description: "Fetch a random dad joke from multiple joke sources.",
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
        name: "add_favorite_joke",
        description: "Add a joke to your favorites list.",
        inputSchema: {
          type: "object",
          properties: {
            joke: {
              type: "string",
              description: "The joke text to add to favorites",
            },
          },
          required: ["joke"],
        },
      },
      {
        name: "get_favorite_jokes",
        description: "Get all your favorite jokes.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "remove_favorite_joke",
        description: "Remove a joke from your favorites list.",
        inputSchema: {
          type: "object",
          properties: {
            index: {
              type: "number",
              description: "Index of the joke to remove (0-based)",
            },
          },
          required: ["index"],
        },
      },
      {
        name: "clear_favorites",
        description: "Clear all favorite jokes.",
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
              enum: ["Programming", "Knock-knock", "General", "Chuck Norris"],
              description: "Joke category",
            },
          },
          required: ["category"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_random_joke") {
      const joke = await fetchRandomJoke();
      return {
        content: [{ type: "text", text: `😄 ${joke}` }],
      };
    }

    if (name === "get_multiple_jokes") {
      const count = Math.min(args.count || 5, 20);
      const jokes = [];
      for (let i = 0; i < count; i++) {
        try {
          const joke = await fetchRandomJoke();
          jokes.push(joke);
        } catch (err) {
          console.error(`Error fetching joke ${i + 1}:`, err);
        }
      }
      let msg = `😄 ${jokes.length} Dad Jokes:\n\n`;
      jokes.forEach((joke, i) => {
        msg += `${i + 1}. ${joke}\n\n`;
      });
      return {
        content: [{ type: "text", text: msg.trim() }],
      };
    }

    if (name === "add_favorite_joke") {
      const joke = args.joke;
      if (favoriteJokes.includes(joke)) {
        return {
          content: [{ type: "text", text: "⭐ This joke is already in your favorites!" }],
        };
      }
      favoriteJokes.push(joke);
      return {
        content: [
          {
            type: "text",
            text: `⭐ Added to favorites! You now have ${favoriteJokes.length} favorite jokes.`,
          },
        ],
      };
    }

    if (name === "get_favorite_jokes") {
      if (favoriteJokes.length === 0) {
        return {
          content: [{ type: "text", text: "No favorite jokes yet. Add some with add_favorite_joke!" }],
        };
      }
      let msg = `⭐ Your ${favoriteJokes.length} Favorite Jokes:\n\n`;
      favoriteJokes.forEach((joke, i) => {
        msg += `${i + 1}. ${joke}\n\n`;
      });
      return {
        content: [{ type: "text", text: msg.trim() }],
      };
    }

    if (name === "remove_favorite_joke") {
      const index = args.index;
      if (index < 0 || index >= favoriteJokes.length) {
        return {
          content: [{ type: "text", text: `Invalid index. You have ${favoriteJokes.length} favorites.` }],
          isError: true,
        };
      }
      const removed = favoriteJokes.splice(index, 1)[0];
      return {
        content: [{ type: "text", text: `Removed: "${removed}"\nRemaining favorites: ${favoriteJokes.length}` }],
      };
    }

    if (name === "clear_favorites") {
      const count = favoriteJokes.length;
      favoriteJokes = [];
      return {
        content: [{ type: "text", text: `Cleared ${count} favorite jokes.` }],
      };
    }

    if (name === "get_joke_category") {
      const category = args.category;
      let url;

      if (category === "Programming") {
        url = "https://v2.jokeapi.dev/joke/Programming?type=single";
      } else if (category === "Knock-knock") {
        url = "https://v2.jokeapi.dev/joke/Knock-Knock?type=single";
      } else if (category === "General") {
        url = "https://v2.jokeapi.dev/joke/General?type=single";
      } else if (category === "Chuck Norris") {
        url = "https://api.chucknorris.io/jokes/random";
      }

      try {
        const response = await fetch(url, { timeout: 5000 });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        let joke = category === "Chuck Norris" ? data.value : data.joke;
        return {
          content: [{ type: "text", text: `😄 ${category} Joke:\n\n${joke}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error fetching ${category} joke: ${err.message}` }],
          isError: true,
        };
      }
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// HTTP Server for Streamable HTTP transport
const app = express();
app.use(express.json({ limit: '10mb' }));

app.get("/", (req, res) => {
  res.send("Dad Jokes MCP Streamable HTTP Server 😄");
});

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

    // Generate session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      const toolsResult = await server.requestHandler(
        { ...request, params: request.params || {} },
        ListToolsRequestSchema
      );
      response = {
        jsonrpc: "2.0",
        id: request.id,
        result: toolsResult,
      };
    } else if (request.method === "tools/call") {
      const callResult = await server.requestHandler(
        { ...request, params: request.params },
        CallToolRequestSchema
      );
      response = {
        jsonrpc: "2.0",
        id: request.id,
        result: callResult,
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
    console.error("Error in /mcp handler:", err);
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
const server_instance = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 Dad Jokes MCP Server (Streamable HTTP) running!
----------------------------------------------------
MCP endpoint:  http://0.0.0.0:${PORT}/mcp
Port:          ${PORT}
  `);
});

server_instance.on("error", (err) => {
  console.error("💥 SERVER ERROR:", err);
});
