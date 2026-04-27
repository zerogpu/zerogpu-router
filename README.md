# ZeroGPU for Claude Code

A Claude Code plugin that teaches Claude when to offload cheap AI tasks — classification, summarization, entity/JSON extraction, follow-up question generation, small-model chat — to the **ZeroGPU Orchestration API** instead of burning Claude tokens.

It ships as two artifacts that work together:

1. **A Skill** ([claude-plugin/plugins/zerogpu/skill/SKILL.md](claude-plugin/plugins/zerogpu/skill/SKILL.md)) — the *guidance layer*. A short markdown file that Claude reads at conversation start; it says "when the user asks for X, call tool Y."
2. **An MCP server** ([mcp-server/](mcp-server/)) — the *execution layer*. A TypeScript server that exposes nine task-centric tools (`zerogpu_classify_iab`, `zerogpu_summarize`, …), each wrapping the ZeroGPU HTTP API with retries, timeouts, and a structured savings log. It runs in two modes:
   - **Local (stdio)** — Claude Code spawns `node dist/index.js` and talks JSON-RPC over the child process's stdin/stdout.
   - **Hosted (Cloudflare Workers)** — the same tool code behind a credential-guarded `/mcp` HTTP endpoint, deployed via `wrangler`.

---

## Table of contents

- [What is MCP?](#what-is-mcp)
- [What is a Skill?](#what-is-a-skill)
- [How the Cloudflare Worker MCP works end-to-end](#how-the-cloudflare-worker-mcp-works-end-to-end)
  - [Architecture](#architecture)
  - [Health check: GET /health](#health-check-get-health)
  - [Initialize a session: POST /mcp — initialize](#initialize-a-session-post-mcp--initialize)
  - [List tools: POST /mcp — tools/list](#list-tools-post-mcp--toolslist)
  - [Call a tool: POST /mcp — tools/call](#call-a-tool-post-mcp--toolscall)
  - [Internal call flow, layer by layer](#internal-call-flow-layer-by-layer)
- [Connecting the MCP: external integration overview](#connecting-the-mcp-external-integration-overview)
- [The Claude Code plugin](#the-claude-code-plugin)
  - [plugin.json — the manifest](#pluginjson--the-manifest)
  - [SKILL.md — the guidance layer](#skillmd--the-guidance-layer)
  - [How they wire together](#how-they-wire-together)
- [Step-by-step: connect Claude Code to the hosted Cloudflare Worker](#step-by-step-connect-claude-code-to-the-hosted-cloudflare-worker)
- [Tools reference](#tools-reference)
- [Troubleshooting](#troubleshooting)

---

## What is MCP?

**MCP (Model Context Protocol)** is a small, open protocol that lets an AI assistant call external tools in a standard way. Think of it as "USB for LLMs": any app that speaks MCP can plug into any AI client that speaks MCP.

Conceptually there are three actors:

```mermaid
flowchart LR
    A["MCP client\n(Claude Code here)\nthe LLM host"]
    B["MCP server\n(zerogpu-mcp)\nthe tool adapter"]
    C["Your real backend\n(ZeroGPU API)\nthe service doing work"]
    A -- JSON-RPC --> B
    B -- HTTP --> C
    C -- HTTP --> B
    B -- JSON-RPC --> A
```

- **MCP client** — the app hosting the LLM (Claude Code, Claude Desktop, Cursor, etc.). It asks the server "what tools do you have?", then calls them on the model's behalf.
- **MCP server** — a small program that advertises a set of **tools** and responds to invocations. Each tool has a name, a description, a JSON-schema for its arguments, and a handler.
- **Transport** — how the two talk. MCP defines two common transports:
  - **stdio** — the client *spawns* the server as a child process and pipes JSON-RPC over stdin/stdout. Used for locally installed servers.
  - **HTTP (Streamable HTTP)** — the server listens on a URL, the client POSTs JSON-RPC messages to it. Used for remote/hosted servers.

A typical call flow when the user asks Claude to "summarize this paragraph":

1. Claude Code lists the server's tools at startup (result: nine `zerogpu_*` tools become visible to the model).
2. The model decides to call `zerogpu_summarize` with `{ text: "..." }`.
3. Claude Code sends a `tools/call` JSON-RPC request to the server over stdio (or HTTP).
4. The server's handler runs, calls the ZeroGPU backend, parses the response, and returns a JSON blob.
5. Claude Code feeds the result back into the model, which writes a reply to the user.

The model never sees the ZeroGPU API key, the retry logic, or the model-routing table — the MCP server is an opaque layer.

---

## What is a Skill?

A **Skill** in Claude Code is a markdown file with YAML frontmatter that tells Claude *when* to do something. It is pure prompt engineering — no code runs. Claude Code auto-loads all skills in your plugins/user/project directories and injects the relevant one into context when its trigger conditions look relevant.

The shape is always the same ([claude-plugin/plugins/zerogpu/skill/SKILL.md](claude-plugin/plugins/zerogpu/skill/SKILL.md)):

```markdown
---
name: zerogpu
description: Route cheap AI tasks ... to ZeroGPU models instead of spending Claude tokens.
allowed-tools:
  - mcp__zerogpu__zerogpu_summarize
  - mcp__zerogpu__zerogpu_classify_zero_shot
  - ...
---

# Body (plain markdown, read by the model as guidance)

## When to use ZeroGPU
...
## When NOT to use it
...
## Tool selection table
| User intent | Tool | Notes |
| ... | ... | ... |
```

Two important details:

- **`allowed-tools`** — a whitelist of MCP tool names the skill is allowed to call. Names follow the pattern `mcp__<server-name>__<tool-name>`. `<server-name>` is the key under `mcpServers` in [plugin.json](claude-plugin/plugins/zerogpu/.claude-plugin/plugin.json) (here: `zerogpu`). `<tool-name>` is whatever the server registered (here: `zerogpu_summarize` etc., giving `mcp__zerogpu__zerogpu_summarize`).
- **The body is the actual guidance.** It contains decision rules ("when the user says 'summarize', call `zerogpu_summarize`"), a tool-selection table, and worked examples.

**Skill vs. MCP server — the clean split:**

| | Skill | MCP server |
|---|---|---|
| What it is | Markdown file | Running program |
| What it does | Teaches Claude *when* to act | Defines *what* actions exist and runs them |
| When loaded | On conversation start (or when relevant) | Registered once; tools listed at startup |
| Runs code? | No | Yes |

---

## How the Cloudflare Worker MCP works end-to-end

### Architecture

The entire server is deployed as a single Cloudflare Worker. The main entry is [mcp-server/src/worker.ts](mcp-server/src/worker.ts), which exports a `fetch` handler and a Durable Object class. The `wrangler.toml` ties them together.

```mermaid
flowchart TD
    Client["HTTP client"]

    subgraph CF["Cloudflare Worker"]
        Fetch["default.fetch() — main fetch handler"]
        Health["200 JSON"]
        Err["400"]
        Serve["ZeroGpuMcp.serve('/mcp')"]

        subgraph DO["Durable Object: ZeroGpuMcp extends McpAgent"]
            Init["init()\nbuild ZeroGpuClient\nload tools from KV\nregisterTools()"]
            Session["JSON-RPC session\nSQLite-backed, WebSocket hibernation"]
        end
    end

    API["ZeroGPU Orchestration API\nPOST /v1/chat/completions\nPOST /v1/responses\nGET /health"]

    Client --> Fetch
    Fetch -- "GET /health" --> Health
    Fetch -- "POST /mcp (missing credentials)" --> Err
    Fetch -- "POST /mcp (credentials present)" --> Serve
    Serve --> DO
    DO --> API
```

**Key source files:**

| File | Role |
|---|---|
| [src/worker.ts](mcp-server/src/worker.ts) | Fetch handler + Durable Object (`ZeroGpuMcp`) |
| [src/server.ts](mcp-server/src/server.ts) | `registerTools()` — shared by Worker and Node |
| [src/zerogpuClient.ts](mcp-server/src/zerogpuClient.ts) | HTTP client for ZeroGPU API (auth, retry, timeout) |
| [src/tools/\*.ts](mcp-server/src/tools/) | One handler per tool |
| [src/config.ts](mcp-server/src/config.ts) | `KvConfigProvider` — reads tool catalog from Cloudflare KV |
| [wrangler.toml](mcp-server/wrangler.toml) | Worker manifest (environments, Durable Object, KV binding) |

---

### Health check: GET /health

The health endpoint is unauthenticated and meant for monitoring systems and load balancers.

**Request:**
```http
GET {MCP_URL}/health
```

No headers required.

**Response (200):**
```json
{ "status": "ok", "env": "production" }
```

`env` reflects `ZEROGPU_MCP_ENV` from `wrangler.toml` (one of `develop`, `staging`, `production`, or `local` for `wrangler dev`).

**Internal flow:**

The fetch handler in [worker.ts:175–179](mcp-server/src/worker.ts#L175) matches `GET /health` before any credential check and returns immediately. No Durable Object is created. No KV is read.

---

### Initialize a session: POST /mcp — initialize

Every MCP session starts with an `initialize` handshake. This is the first request the client must send before listing or calling tools.

**Request:**
```http
POST {MCP_URL}/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
x-api-key: <your-zerogpu-api-key>
x-project-id: <your-zerogpu-project-id>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "my-client", "version": "1.0" }
  }
}
```

**Required headers:**

| Header | Value | Purpose |
|---|---|---|
| `Content-Type` | `application/json` | Tells the Worker to parse the body as JSON |
| `Accept` | `application/json, text/event-stream` | Declares support for both plain JSON and SSE streams |
| `x-api-key` | Your ZeroGPU API key | Forwarded to the ZeroGPU backend on every tool call |
| `x-project-id` | Your ZeroGPU project ID | Forwarded to the ZeroGPU backend on every tool call |

**Response (200):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "zerogpu-mcp", "version": "0.1.0" }
  }
}
```

The response also carries an `mcp-session-id` header. You **must** include this header on every subsequent request in the same session.

**Internal flow:**

1. [worker.ts:188–196](mcp-server/src/worker.ts#L188) — the fetch handler reads `x-api-key` and `x-project-id` from headers. If either is missing, it returns 400 with a JSON-RPC error (`code: -32602`).
2. [worker.ts:200](mcp-server/src/worker.ts#L200) — the credentials are attached to the execution context as `props: { apiKey, projectId }`.
3. [worker.ts:204](mcp-server/src/worker.ts#L204) — `ZeroGpuMcp.serve("/mcp")` creates (or retrieves) a Durable Object instance for this session and routes the request to it.
4. The Durable Object's `init()` ([worker.ts:84–119](mcp-server/src/worker.ts#L84)) runs once per new session:
   - Validates that `ZEROGPU_ORCHESTRATION_URL` and the `ZEROGPU_CONFIG` KV binding are present.
   - Validates that `this.props.apiKey` and `this.props.projectId` are set.
   - Creates a `ZeroGpuClient` with those credentials.
   - Creates a `KvConfigProvider` that reads the tool catalog from KV.
   - Calls `registerTools()` which maps tool names to their handlers.
5. The MCP SDK (via `McpAgent`) replies with the `initialize` response and hands back the `mcp-session-id`.

---

### List tools: POST /mcp — tools/list

After initialization, the client discovers what tools are available.

**Request:**
```http
POST {MCP_URL}/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
x-api-key: <your-zerogpu-api-key>
x-project-id: <your-zerogpu-project-id>
mcp-session-id: <session-id-from-initialize-response>

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response (200):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "zerogpu_health",
        "description": "Verifies the ZeroGPU Orchestration API is reachable...",
        "inputSchema": { "type": "object", "properties": {}, "required": [] }
      },
      {
        "name": "zerogpu_summarize",
        "description": "Summarize a passage with Google T5-small...",
        "inputSchema": {
          "type": "object",
          "properties": {
            "text": { "type": "string" },
            "max_tokens": { "type": "number" }
          },
          "required": ["text"]
        }
      }
      // ... seven more tools
    ]
  }
}
```

**Internal flow:**

The `mcp-session-id` header routes the request to the same Durable Object instance created during `initialize`. The MCP SDK (inside `McpAgent`) already has the registered tool list in memory from `init()`. It reads the registered tools and returns their names, descriptions, and input schemas. No KV or ZeroGPU backend calls happen.

---

### Call a tool: POST /mcp — tools/call

This is the main operation — asking the server to run a tool.

**Request:**
```http
POST {MCP_URL}/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
x-api-key: <your-zerogpu-api-key>
x-project-id: <your-zerogpu-project-id>
mcp-session-id: <session-id-from-initialize-response>

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "zerogpu_summarize",
    "arguments": {
      "text": "Artificial intelligence is transforming every industry..."
    }
  }
}
```

**Response (200) — success:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"summary\":\"AI is transforming industries.\",\"model\":\"t5-small\",\"usage\":{\"prompt_tokens\":42,\"completion_tokens\":8},\"savings\":{\"zerogpu_cost_usd\":0.0000031,\"baseline_cost_usd\":0.000246,\"savings_usd\":0.000243}}"
      }
    ]
  }
}
```

**Response (200) — tool-level error (the MCP envelope is still 200):**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "{\"error\":\"ZeroGPU upstream POST /v1/chat/completions failed: 401\"}"
      }
    ]
  }
}
```

**Internal flow (taking `zerogpu_summarize` as the example):**

1. The DO receives the `tools/call` JSON-RPC message over the session WebSocket.
2. The MCP SDK looks up `zerogpu_summarize` in the registered tool map and calls its handler.
3. [tools/summarize.ts](mcp-server/src/tools/summarize.ts) validates the arguments against its Zod schema, then calls `runChat()` from [tools/shared.ts](mcp-server/src/tools/shared.ts).
4. `runChat()`:
   - Loads the config (from the in-memory KV cache if TTL has not expired, otherwise re-fetches from KV).
   - Looks up the model for task `"summarize"` → `t5-small`, endpoint `"chat"`.
   - Prepends `"summarize: "` to the user text (T5 requires this prefix).
   - Calls `client.chatCompletions({ model: "t5-small", messages: [...] })`.
5. `ZeroGpuClient.chatCompletions()` in [zerogpuClient.ts:227](mcp-server/src/zerogpuClient.ts#L227):
   - POSTs to `{ZEROGPU_ORCHESTRATION_URL}/v1/chat/completions`.
   - Sets `content-type: application/json`, `accept: application/json`, `x-api-key`, `x-project-id`.
   - Uses an `AbortController` with a 30-second timeout.
   - On 429/502/503/504, retries up to 3 times with exponential backoff (`400ms × 2^attempt + 0–200ms jitter`).
   - On success (2xx), returns the parsed JSON response.
   - On failure, throws `ZeroGpuError` with the HTTP status and the first 500 characters of the response body.
6. Back in `runChat()`, the response content is extracted, savings are computed against the Claude baseline price table, and a savings JSON line is emitted to the Worker log stream (`console.log`).
7. The handler wraps the result in an MCP `content` array via `mcpJson()` and returns it.
8. The MCP SDK serializes the JSON-RPC response and sends it back to the client.

---

### Internal call flow, layer by layer

```mermaid
flowchart TD
    Client["HTTP client (e.g. Claude Code)\nPOST {MCP_URL}/mcp\nHeaders: x-api-key, x-project-id, mcp-session-id\nBody: JSON-RPC tools/call"]

    Worker["worker.ts — default.fetch()\nValidates x-api-key + x-project-id (400 if missing)\nAttaches apiKey, projectId to props\nDelegates to ZeroGpuMcp.serve('/mcp')"]

    subgraph DO["ZeroGpuMcp Durable Object (McpAgent)"]
        Init["init() — once per session\nValidate env secrets + props\nnew ZeroGpuClient(baseUrl, apiKey, projectId)\nnew KvConfigProvider(ZEROGPU_CONFIG KV, ttlMs)\nregisterTools(server, ctx, config.tools)"]
        SDK["MCP SDK routes tools/call to handler"]
    end

    Handler["tools/handler.ts\nValidates args (Zod)\nrunChat(ctx, { task, messages, ... })"]

    ZGClient["zerogpuClient.ts\nPOST /v1/chat/completions (or /v1/responses)\nHeaders: x-api-key, x-project-id\nTimeout: 30s (AbortController)\nRetry: 429/502/503/504, up to 3×, exponential backoff"]

    API["ZeroGPU Orchestration API"]

    Parse["tools/handler.ts\nParse response (stripCodeFence, safeJsonParse, stripThinkTags)\nCompute savings (computeSavings)\nLog savings JSON (console.log → Worker log stream)\nmcpJson({ result }) → MCP content array"]

    Response["JSON-RPC response back to client"]

    Client --> Worker
    Worker --> DO
    Init --> SDK
    SDK --> Handler
    Handler --> ZGClient
    ZGClient --> API
    API --> Parse
    Parse --> Response
```

---

## Connecting the MCP: external integration overview

The `/mcp` endpoint speaks **JSON-RPC 2.0 over HTTP**. Any client that can issue HTTP POST requests and follow the session handshake can connect.

### What every client must do

1. **Send `x-api-key` and `x-project-id` on every request** — these are forwarded to the ZeroGPU backend and must match a valid ZeroGPU project.
2. **Start with `initialize`** — the server will reject `tools/list` and `tools/call` before initialization.
3. **Carry the `mcp-session-id`** — the header returned by `initialize` must be sent on every follow-up request in the same session. Without it, the Worker routes the request to a fresh DO instance which will error.
4. **Set `Accept: application/json, text/event-stream`** — required by the Streamable HTTP transport. Plain `application/json` alone will be rejected by the MCP SDK.

### Connection methods

| Client type | How to connect |
|---|---|
| **Claude Code** | `claude mcp add --transport http <name> {MCP_URL}/mcp --header "x-api-key: ..." --header "x-project-id: ..."` |
| **cURL / REST tools** | Three-step flow: health check → initialize → tools/list or tools/call (manually carry session ID) |
| **MCP Inspector** | Set server URL to `{MCP_URL}/mcp`, add custom headers in the UI |
| **Any MCP SDK client** | Pass `{MCP_URL}/mcp` as the SSE/HTTP endpoint; inject the two credential headers |
| **Postman** | Pre-request script that carries `mcp-session-id` between requests |

### What you never need to share

The Worker does not use or expose a separate bearer token for the `/mcp` endpoint — access is controlled entirely by the `x-api-key` and `x-project-id` headers that gate the underlying ZeroGPU API. Rotate those headers to revoke access.

> **Note on the `/health` endpoint:** `GET {MCP_URL}/health` requires *no* credentials and returns `{ "status": "ok", "env": "..." }`. Use it as a low-cost probe to verify the Worker is deployed and reachable before starting an MCP session.

---

## The Claude Code plugin

### plugin.json — the manifest

[claude-plugin/plugins/zerogpu/.claude-plugin/plugin.json](claude-plugin/plugins/zerogpu/.claude-plugin/plugin.json) is the primary manifest Claude Code reads when it installs the plugin. It has two entries that matter:

```json
{
  "name": "zerogpu",
  "version": "0.1.0",
  "skills": ["./skill"],
  "mcpServers": {
    "zerogpu": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/../../../mcp-server/dist/index.js"],
      "env": {
        "ZEROGPU_ORCHESTRATION_URL": "${ZEROGPU_ORCHESTRATION_URL}",
        "ZEROGPU_API_KEY": "${ZEROGPU_API_KEY}",
        "ZEROGPU_PROJECT_ID": "${ZEROGPU_PROJECT_ID}"
      }
    }
  }
}
```

**`skills`** — a list of relative paths to skill folders. Claude Code finds `SKILL.md` inside each folder and loads its content into context.

**`mcpServers.zerogpu`** — tells Claude Code how to launch the local MCP server as a child process:

- `command` and `args` become the shell command. `${CLAUDE_PLUGIN_ROOT}` is resolved at runtime to the plugin's install directory; the path `../../../mcp-server/dist/index.js` navigates up to find the built server next to the plugin folder in this repo.
- The `env` block forwards three environment variables from Claude Code's own environment into the child process. Claude Code reads these variables from `~/.claude/settings.json → env`, substitutes `${ZEROGPU_…}` placeholders, and passes the resolved values to the spawned server.

The key named `"zerogpu"` inside `mcpServers` becomes the **server name**. All tool names in Claude Code's UI follow the pattern `mcp__<server-name>__<tool-name>`, so this produces `mcp__zerogpu__zerogpu_summarize`, `mcp__zerogpu__zerogpu_health`, etc.

> **Local-only server.** This `mcpServers` block makes Claude Code spawn `node dist/index.js` (stdio transport). If you want Claude Code to talk to the *hosted Cloudflare Worker* instead, remove this block from `plugin.json` and register the Worker separately with `claude mcp add --transport http`. See [Step-by-step guide](#step-by-step-connect-claude-code-to-the-hosted-cloudflare-worker) below.

### SKILL.md — the guidance layer

[claude-plugin/plugins/zerogpu/skill/SKILL.md](claude-plugin/plugins/zerogpu/skill/SKILL.md) is a markdown file with YAML frontmatter. Claude Code injects its body into the model's context when the skill is relevant.

```
---
name: zerogpu
description: Route cheap AI tasks to ZeroGPU models instead of spending Claude tokens.
allowed-tools:
  - mcp__zerogpu__zerogpu_health
  - mcp__zerogpu__zerogpu_classify_iab
  - mcp__zerogpu__zerogpu_summarize
  - ... (nine total)
---

# ZeroGPU offload guidance

## When to use ZeroGPU
Offload when the input is plain text and the task is one of:
classify / summarize / extract entities or JSON / suggest follow-up questions / short chat.

## When NOT to use it
Keep in Claude when the task requires code, reasoning over prior messages, or long-form output.

## Tool selection table
| User intent | Tool |
| "Summarize this" | zerogpu_summarize |
| "Classify into IAB" | zerogpu_classify_iab |
| ...               | ...                |

## Worked examples
...
```

**`allowed-tools`** is a whitelist: Claude will only call the listed tools when acting under this skill's guidance. The names must exactly match `mcp__<server-name>__<tool-name>`.

**The body** is the decision logic — it tells the model when to route to ZeroGPU, which tool maps to which user intent, and what to do when a tool fails.

### How they wire together

When Claude Code starts a session with the plugin installed:

1. It reads `plugin.json` and spawns `node dist/index.js` (or later sends HTTP requests to the Worker URL, depending on your registration).
2. It calls `tools/list` on the MCP server and registers the nine `zerogpu_*` tools with the model.
3. It reads `SKILL.md` and makes its body available to the model in context.
4. When the user sends a message, the model checks the skill guidance. If the task fits ("summarize this paragraph"), the skill tells the model to call `zerogpu_summarize`.
5. Claude Code translates that into a `tools/call` JSON-RPC request and sends it to the MCP server (stdio or HTTP).
6. The server runs the handler, calls ZeroGPU, and returns the result.
7. Claude Code feeds the result back to the model, which writes its reply.

```mermaid
flowchart TD
    User["User message"]
    Skill["Claude reads SKILL.md guidance\n'this is a summarize task → call zerogpu_summarize'"]
    CC["Claude Code sends tools/call to MCP server\n(stdio or HTTP, depending on registration)"]
    MCP["MCP server handler → zerogpuClient → ZeroGPU API"]
    Result["Result returned to model → model writes reply to user"]

    User --> Skill
    Skill --> CC
    CC --> MCP
    MCP --> Result
```

The skill and the server are deliberately decoupled: the skill is a text file (no code), the server is a running process. Updating tool descriptions requires only redeploying the server (or updating the KV catalog); the skill's routing table only needs updating when you add or remove whole tools.

---

## Step-by-step: connect Claude Code to the hosted Cloudflare Worker

This guide assumes the Worker is already deployed and you know its URL (`{MCP_URL}`) and your ZeroGPU credentials.

### Step 1 — verify the Worker is up

```bash
curl -s {MCP_URL}/health
```

Expected: `{"status":"ok","env":"production"}` (or `develop`/`staging`). If you get a network error, the Worker is not deployed or the URL is wrong. If you get `{"status":"ok"}` but `env` is missing, the `ZEROGPU_MCP_ENV` secret was not set.

### Step 2 — register the MCP server in Claude Code

Open a terminal and run:

```bash
claude mcp add --transport http zerogpu \
  {MCP_URL}/mcp \
  --header "x-api-key: <your-zerogpu-api-key>" \
  --header "x-project-id: <your-zerogpu-project-id>"
```

- `zerogpu` is the name Claude Code will use for this server. Tool names will appear as `mcp__zerogpu__zerogpu_summarize` etc.
- `--transport http` tells Claude Code to use the Streamable HTTP transport (not stdio).
- The `--header` flags are sent on every request to `/mcp`, including the `initialize` handshake.

Claude Code stores this registration in `~/.claude/settings.json` under `mcpServers`.

### Step 3 — install the skill (optional but recommended)

The skill is the guidance layer that tells Claude *when* to call ZeroGPU tools. Without it, the model has to infer when to use each tool from the tool descriptions alone.

**3a.** Register the marketplace (substitute your repo path):

```
/plugin marketplace add <path-to-repo>/claude-plugin
```

**3b.** Install the plugin:

```
/plugin install zerogpu@zerogpu-local
```

**3c.** Because you already registered the Worker via `claude mcp add`, the plugin's built-in `mcpServers` block would start a *second*, local stdio server alongside the Worker. Prevent that by removing the `mcpServers` key from the plugin manifest:

Open [claude-plugin/plugins/zerogpu/.claude-plugin/plugin.json](claude-plugin/plugins/zerogpu/.claude-plugin/plugin.json) and delete the `mcpServers` block, keeping only `skills`:

```json
{
  "name": "zerogpu",
  "version": "0.1.0",
  "skills": ["./skill"]
}
```

This leaves the skill active but tells Claude Code not to spawn a local stdio server for this plugin — it will use your Worker registration instead.

### Step 4 — restart Claude Code

Close and reopen the Claude Code CLI (or your IDE extension). Plugin registration and MCP session initialization happen at session start.

### Step 5 — verify the connection

Inside the new session:

```
/mcp
```

The `zerogpu` server should appear in the list with status **connected** and nine tools visible.

### Step 6 — smoke test

Run the health tool:

```
Run the zerogpu health tool.
```

Claude should call `mcp__zerogpu__zerogpu_health`, which hits `{MCP_URL}/mcp` → Worker → ZeroGPU `/health` → returns status.

Test a real task:

```
Summarize this: "Renewable energy adoption is accelerating globally, driven by falling solar and wind costs."
```

The skill guidance should steer the model to call `zerogpu_summarize` instead of answering directly. The reply will include the summary and a savings estimate.

### Step 7 — check Worker logs (optional)

Every tool call emits a savings log line to the Worker's log stream. View it in the Cloudflare dashboard:

**Workers & Pages → `zerogpu-mcp-<env>` → Logs**

Each line looks like:

```json
{
  "kind": "zerogpu.savings",
  "tool": "zerogpu_summarize",
  "model": "t5-small",
  "input_tokens": 42,
  "output_tokens": 8,
  "zerogpu_cost_usd": 0.0000031,
  "baseline_cost_usd": 0.000246,
  "savings_usd": 0.000243,
  "latency_ms": 231
}
```

### Managing multiple environments

Register each environment as a separate named server to keep them side-by-side in `/mcp`:

```bash
claude mcp add --transport http zerogpu-dev \
  https://zerogpu-mcp-develop.<subdomain>.workers.dev/mcp \
  --header "x-api-key: <key>" --header "x-project-id: <id>"

claude mcp add --transport http zerogpu-staging \
  https://zerogpu-mcp-staging.<subdomain>.workers.dev/mcp \
  --header "x-api-key: <key>" --header "x-project-id: <id>"

claude mcp add --transport http zerogpu \
  https://zerogpu-mcp.<subdomain>.workers.dev/mcp \
  --header "x-api-key: <key>" --header "x-project-id: <id>"
```

---

## Tools reference

All tools return `{ <task-specific fields>, model, usage, savings }`. `savings` compares ZeroGPU's cost against a nominal Claude baseline. `raw` is included only when the underlying model returned something the tool couldn't parse cleanly.

| Tool | Input | Purpose | Model |
|---|---|---|---|
| `zerogpu_health` | — | Ping the ZeroGPU backend. | — |
| `zerogpu_classify_iab` | `text`, `enriched?` | IAB topic classification. `enriched: true` uses the richer taxonomy. | `zlm-v1-iab-classify-edge[-enriched]` |
| `zerogpu_summarize` | `text`, `max_tokens?` | Summarize a passage. | `t5-small` |
| `zerogpu_classify_zero_shot` | `text`, `labels[]`, `threshold?` | Score text against a flat label list. | `deberta-v3-small` |
| `zerogpu_extract_entities` | `text`, `labels[]`, `threshold?` | Named entity recognition over a custom label list. | `gliner2-base-v1` |
| `zerogpu_extract_json` | `text`, `schema` | Structured JSON extraction from a field schema. | `gliner2-base-v1` |
| `zerogpu_classify_structured` | `text`, `schema` | Multi-axis classification from a grouped-label schema. | `gliner2-base-v1` |
| `zerogpu_generate_followups` | `text` | Generate follow-up questions about a passage. | `zlm-v1-followup-questions-edge` |
| `zerogpu_chat` | `messages[]`, `thinking?`, `model?`, `max_tokens?`, `temperature?` | General chat. `thinking: true` routes to the reasoning model and splits `<think>…</think>` into a separate `reasoning` field. | `LFM2.5-1.2B-Instruct` / `-Thinking` |

---

## Troubleshooting

**`/mcp` returns 400 with `"missing required headers: x-api-key and x-project-id"`**
The Worker received a request to `/mcp` without both credential headers. Add `--header "x-api-key: ..."` and `--header "x-project-id: ..."` to your `claude mcp add` command, or add them to your HTTP client's request.

**`/mcp` returns `isError: true` with a 401 from ZeroGPU**
The Worker reached the ZeroGPU backend but the API key or project ID was rejected. Re-check both values against your ZeroGPU project dashboard.

**Worker returns 500 at session start with `"Missing required secret: ZEROGPU_ORCHESTRATION_URL"`**
The `ZEROGPU_ORCHESTRATION_URL` secret was never set on that environment. Run `wrangler secret put ZEROGPU_ORCHESTRATION_URL --env <env>`.

**Worker returns 500 with `"Missing required binding: ZEROGPU_CONFIG"`**
The KV namespace was not created or the binding was removed from `wrangler.toml`. Re-deploy after re-adding the `[[kv_namespaces]]` block.

**`tools/list` returns an empty list**
The KV catalog key `"catalog"` is missing or empty. Seed it: `node scripts/seed-kv.mjs --env <env>`.

**`/mcp` shows as connected in Claude Code but tool calls return `isError: true` with `"ZeroGPU upstream … failed: 401"`**
The credential headers passed during `claude mcp add` are being forwarded correctly but rejected by ZeroGPU. Rotate your API key and update the `claude mcp add` registration.

**Claude doesn't call any `zerogpu_*` tool even though the task fits**
Confirm the skill loaded (`/plugin` lists `zerogpu` as enabled) and the MCP server is connected (`/mcp` shows it green with nine tools). If both look fine, the model may have judged the task too complex; the skill's "when NOT to use it" section is deliberately conservative.

**`mcp-session-id` errors or "session not found"**
The session ID was not forwarded on a follow-up request. Every request after `initialize` must include the `mcp-session-id` header received in the `initialize` response. Claude Code and the MCP SDK handle this automatically; manual cURL flows require it explicitly.
