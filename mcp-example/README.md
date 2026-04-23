# ZeroGPU for Claude Code

A single Claude Code plugin that teaches Claude when to offload cheap AI tasks — classification, summarization, entity/JSON extraction, follow-up question generation, small-model chat — to the **ZeroGPU Orchestration API** instead of burning Claude tokens.

It ships as two artifacts that work together:

1. **A Skill** ([plugins/zerogpu/skill/SKILL.md](plugins/zerogpu/skill/SKILL.md)) — the *guidance layer*. A short markdown file that Claude reads at conversation start; it says "when the user asks for X, call tool Y."
2. **An MCP server** ([plugins/zerogpu/mcp-servers/zerogpu-mcp/](plugins/zerogpu/mcp-servers/zerogpu-mcp/)) — the *execution layer*. A TypeScript server that exposes nine task-centric tools (`zerogpu_classify_iab`, `zerogpu_summarize`, …), each wrapping the ZeroGPU HTTP API with retries, timeouts, and a structured savings log. It runs in two modes:
   - **Local (stdio)** — Claude Code spawns `node dist/index.js` and talks JSON-RPC over the child process's stdin/stdout.
   - **Hosted (Cloudflare Workers)** — the same tool code, re-entered through a `McpAgent` Durable Object behind a bearer-guarded `/mcp` endpoint. Deployed via `wrangler` to three named environments (develop, staging, production) by the workflows in [.github/workflows](../.github/workflows).

If you just want to try it, skip to [Quick start](#quick-start). If you've never heard of MCP or Skills, read the two primer sections first — everything else in this README assumes you have those mental models.

---

## Table of contents

- [What is MCP?](#what-is-mcp)
- [What is a Skill?](#what-is-a-skill)
- [How this plugin is wired together](#how-this-plugin-is-wired-together)
- [File-by-file reference](#file-by-file-reference)
- [Tools exposed by the MCP server](#tools-exposed-by-the-mcp-server)
- [Quick start](#quick-start)
- [Installing the plugin locally in Claude Code](#installing-the-plugin-locally-in-claude-code)
- [Running the server standalone](#running-the-server-standalone)
- [Hosting on Cloudflare Workers](#hosting-on-cloudflare-workers)
  - [Architecture](#architecture)
  - [What you must set up on Cloudflare (one time per account)](#what-you-must-set-up-on-cloudflare-one-time-per-account)
  - [Deploy pipeline (GitHub Actions)](#deploy-pipeline-github-actions)
  - [Deploying by hand](#deploying-by-hand)
  - [Smoke-testing a deployed Worker](#smoke-testing-a-deployed-worker)
  - [Pointing Claude Code at the hosted Worker](#pointing-claude-code-at-the-hosted-worker)
  - [Testing the hosted MCP server from Claude Code](#testing-the-hosted-mcp-server-from-claude-code)
- [Verifying it works](#verifying-it-works)
- [Troubleshooting](#troubleshooting)

---

## What is MCP?

**MCP (Model Context Protocol)** is a small, open protocol that lets an AI assistant call external tools in a standard way. Think of it as "USB for LLMs": any app that speaks MCP can plug into any AI client that speaks MCP.

Conceptually there are three actors:

```
┌────────────────────┐       JSON-RPC        ┌──────────────────────┐       HTTP          ┌──────────────────────┐
│ MCP client         │  ───────────────────▶ │ MCP server           │ ──────────────────▶ │ Your real backend    │
│ (Claude Code here) │  ◀─────────────────── │ (zerogpu-mcp)        │ ◀────────────────── │ (ZeroGPU API)        │
└────────────────────┘                       └──────────────────────┘                     └──────────────────────┘
     the LLM host                             the tool adapter                              the service doing work
```

- **MCP client** — the app hosting the LLM (Claude Code, Claude Desktop, Cursor, etc.). It asks the server "what tools do you have?", then calls them on the model's behalf.
- **MCP server** — a small program that advertises a set of **tools** and responds to invocations. Each tool has a name, a description, a JSON-schema for its arguments, and a handler. The server doesn't know or care what LLM is on the other side.
- **Transport** — how the two talk. MCP defines two common transports:
  - **stdio** — the client *spawns* the server as a child process and pipes JSON-RPC over stdin/stdout. Zero config, used for locally installed servers.
  - **HTTP** (Streamable HTTP) — the server listens on a URL, the client POSTs JSON-RPC messages to it. Used for remote/hosted servers. This plugin configures HTTP in **JSON-only** mode (no Server-Sent Events) so each call returns one plain JSON body.

A typical call flow when the user asks Claude to "summarize this paragraph":

1. Claude Code lists the server's tools at startup (result: nine `zerogpu_*` tools become visible to the model).
2. The model decides to call `zerogpu_summarize` with `{ text: "..." }`.
3. Claude Code sends a `tools/call` JSON-RPC request to the server over stdio (or HTTP).
4. The server's handler runs, which calls the ZeroGPU backend, parses the response, and returns a JSON blob.
5. Claude Code feeds the result back into the model, which writes a reply to the user.

The model never sees the ZeroGPU API key, the retry logic, or the model-routing table — the MCP server is an opaque layer. That's the whole point.

**Why not just "call the API directly" from Claude?** Because Claude is an LLM, not an HTTP client. The MCP server does three things the model can't do safely on its own: hold credentials, run deterministic request/retry logic, and expose a *typed* interface the model can plan against.

---

## What is a Skill?

A **Skill** in Claude Code is a markdown file with YAML frontmatter that tells Claude *when* to do something. It is pure prompt engineering — no code runs. Claude Code auto-loads all skills in your plugins/user/project directories and injects the relevant one into context when its trigger conditions look relevant.

The shape is always the same ([plugins/zerogpu/skill/SKILL.md](plugins/zerogpu/skill/SKILL.md)):

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

- **`allowed-tools`** — a whitelist of MCP tool names the skill is allowed to call. Names follow the pattern `mcp__<server-name>__<tool-name>`. `<server-name>` is the key under `mcpServers` in [plugin.json](plugins/zerogpu/.claude-plugin/plugin.json) (here: `zerogpu`). `<tool-name>` is whatever the server registered (here: `zerogpu_summarize` etc., giving `mcp__zerogpu__zerogpu_summarize`).
- **The body is the actual guidance.** It contains decision rules ("when the user says 'summarize', call `zerogpu_summarize`"), a tool-selection table, and worked examples. Good skill bodies are short, decision-oriented, and imperative — they are not documentation.

**Skill vs. MCP server — the clean split:**

| | Skill | MCP server |
|---|---|---|
| What it is | Markdown file | Running program |
| What it does | Teaches Claude *when* to act | Defines *what* actions exist and runs them |
| When loaded | On conversation start (or when relevant) | Registered once; tools listed at startup |
| Runs code? | No | Yes |

Skills without an MCP server are just prompt snippets. MCP servers without skills still work (the model can discover tools on its own) but the model has to figure out from tool descriptions alone when each one applies — skills dramatically improve tool selection quality.

---

## How this plugin is wired together

```
plugins/zerogpu/
├── .claude-plugin/
│   └── plugin.json             ← Claude Code plugin manifest — declares the skill and the MCP server
├── skill/
│   └── SKILL.md                ← guidance layer (prose)
└── mcp-servers/
    └── zerogpu-mcp/            ← execution layer (TypeScript MCP server)
        ├── package.json
        ├── tsconfig.json           ← Node build (emits dist/)
        ├── tsconfig.worker.json    ← Worker type-check config (no emit)
        ├── wrangler.toml           ← Cloudflare Worker manifest (local + develop/staging/production envs)
        ├── vitest.config.ts
        ├── .env.example
        ├── src/
        │   ├── index.ts                 ← Node entry (stdio transport)
        │   ├── worker.ts                ← Cloudflare Worker entry (McpAgent + Durable Object)
        │   ├── server.ts                ← registerTools() — shared by both entries
        │   ├── zerogpuClient.ts         ← fetch wrapper (auth, timeout, retry) — runtime-agnostic
        │   ├── modelCatalog.ts          ← task → model-id map
        │   ├── parsers.ts               ← safe JSON parse, ```json fence strip, <think> splitter
        │   ├── savings.ts               ← cost estimator + structured logger (stderr on Node, console on Workers)
        │   ├── tools/                   ← one file per tool handler — runtime-agnostic
        │   │   ├── shared.ts
        │   │   ├── health.ts
        │   │   ├── classifyIab.ts
        │   │   ├── summarize.ts
        │   │   ├── classifyZeroShot.ts
        │   │   ├── extractEntities.ts
        │   │   ├── extractJson.ts
        │   │   ├── classifyStructured.ts
        │   │   ├── generateFollowups.ts
        │   │   └── chat.ts
        │   └── transports/
        │       └── stdio.ts             ← Node child-process transport (Claude Code default)
        └── tests/
            ├── tools.unit.test.ts       ← MSW-mocked, runs in CI
            └── live.postman.test.ts     ← gated by ZEROGPU_LIVE=1
```

The chain from user message to ZeroGPU call:

```
user message
    │
    ▼
Claude Code (MCP client) — auto-loads plugin.json, reads SKILL.md, lists MCP tools
    │
    ▼   (model picks tool based on skill guidance)
zerogpu-mcp:src/server.ts — routes JSON-RPC to a handler
    │
    ▼
zerogpu-mcp:src/tools/<tool>.ts — validates args, builds upstream request
    │
    ▼
zerogpu-mcp:src/zerogpuClient.ts — POSTs to /v1/chat/completions with x-api-key + x-project-id
    │
    ▼
ZeroGPU Orchestration API — runs the small/nano model
```

---

## File-by-file reference

### Plugin manifest

**[plugins/zerogpu/.claude-plugin/plugin.json](plugins/zerogpu/.claude-plugin/plugin.json)** — tells Claude Code what this plugin provides. Two keys matter:

- `skills: ["./skill"]` — relative path to the skill folder. Claude Code scans it for `SKILL.md`.
- `mcpServers.zerogpu` — how to launch the MCP server. `command` + `args` are the shell command; `${PLUGIN_DIR}` is expanded to the plugin's on-disk location. The `env` block forwards three required environment variables from Claude Code's own environment (which you set in `~/.claude/settings.json`) into the child process.

### Skill

**[plugins/zerogpu/skill/SKILL.md](plugins/zerogpu/skill/SKILL.md)** — see [What is a Skill?](#what-is-a-skill) above.

### MCP server project files

**[package.json](plugins/zerogpu/mcp-servers/zerogpu-mcp/package.json)** — Node package manifest. `"type": "module"` means ESM. `bin.zerogpu-mcp` lets the server run as a CLI after `npm link`. Scripts: `build` compiles TS to `dist/`, `start` runs the compiled server, `test` runs Vitest, `inspect` launches the MCP Inspector for manual exploration.

**[tsconfig.json](plugins/zerogpu/mcp-servers/zerogpu-mcp/tsconfig.json)** — TypeScript config. Targets ES2022, NodeNext module resolution, strict mode on, outputs to `dist/`.

**[vitest.config.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/vitest.config.ts)** — test runner config. Node environment, 20s test timeout.

**[.env.example](plugins/zerogpu/mcp-servers/zerogpu-mcp/.env.example)** — canonical list of env vars. Copy to `.env` and fill in.

### MCP server source

**[src/index.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/index.ts)** — Node entry point. Reads the three ZeroGPU env vars (fail-fast if missing), builds a `ZeroGpuClient` + `McpServer` via `buildServer()`, and runs the stdio transport. This is what `node dist/index.js` executes when Claude Code spawns the plugin locally.

**[src/worker.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/worker.ts)** — Cloudflare Worker entry point. `ZeroGpuMcp extends McpAgent<Env>` from the `agents` package: it's a Durable Object whose `init()` hook builds a `ZeroGpuClient` from `this.env` and calls the shared `registerTools()` helper. The exported `default.fetch` enforces `Authorization: Bearer ${ZEROGPU_MCP_BEARER}` on `/mcp` traffic, responds to `GET /health` without a bearer, and delegates everything else to `ZeroGpuMcp.serve("/mcp")`.

**[src/server.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/server.ts)** — exports `registerTools(server, client)` (used by both Node and Worker entries) and `buildServer({ client })` (used by Node). Each of the nine registrations looks like `server.registerTool(name, { title, description, inputSchema: zodSchema.shape }, handler)`.

**[wrangler.toml](plugins/zerogpu/mcp-servers/zerogpu-mcp/wrangler.toml)** — Cloudflare Worker manifest. A top-level `[local]` profile used by `wrangler dev`, plus three `[env.<name>]` blocks (`develop` / `staging` / `production`) that each declare the per-env Worker script name, the `MCP_OBJECT` Durable Object binding pointing at `ZeroGpuMcp`, and the SQLite migration that creates its storage.

**[src/zerogpuClient.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/zerogpuClient.ts)** — the only thing that talks to the ZeroGPU backend. It uses Node's global `fetch`, attaches `x-api-key` and `x-project-id` headers on every request, aborts on a 30-second timeout via `AbortController`, retries 429/502/503/504 up to 3 times with exponential backoff (+jitter), and throws a typed `ZeroGpuError` with the upstream status + body excerpt on failure. Exports: `chatCompletions()`, `responses()`, `health()`.

**[src/modelCatalog.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/modelCatalog.ts)** — maps internal task names to upstream model IDs and endpoints. The shape (`Record<Task, { id, endpoint }>`) is deliberate: when the backend later supports a remote catalog fetch, the map can be swapped for a TTL cache without changing callers.

**[src/parsers.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/parsers.ts)** — three small pure functions: `stripCodeFence` removes ```` ```json ```` wrappers, `safeJsonParse` returns `{ parsed, raw, ok }` instead of throwing, and `stripThinkTags` pulls `<think>…</think>` traces out of `LFM2.5-…-Thinking` output into a separate `reasoning` field so `content` is always the clean answer.

**[src/savings.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/savings.ts)** — a pinned price table (`PRICE_TABLE_VERSION = "2026-04-22"`) comparing ZeroGPU's per-token cost against a nominal Claude baseline. Each tool call emits one JSON line with `{ tool, model, input_tokens, output_tokens, zerogpu_cost_usd, baseline_cost_usd, savings_usd, latency_ms }`. On Node it goes to **stderr** (so it never interferes with the JSON-RPC channel on stdout); on Cloudflare Workers it falls back to `console.log` and shows up in the Worker log stream.

**[src/tools/](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/tools/)** — one file per exposed tool. Each file exports a zod argument schema and a handler function. They all follow the same shape: validate args, build an upstream request body, delegate to the shared `runChat` helper, and wrap the result in an MCP `content` array. See [Tools exposed](#tools-exposed-by-the-mcp-server) below for what each one does.

**[src/transports/stdio.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/transports/stdio.ts)** — connects the server to `StdioServerTransport`. The server reads line-delimited JSON-RPC from stdin and writes responses to stdout. Used when Claude Code spawns the server as a child process.

The hosted HTTP transport lives in [src/worker.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/worker.ts) and is described in [Hosting on Cloudflare Workers](#hosting-on-cloudflare-workers) — the previous Express-based local HTTP transport has been removed in favor of that Workers-native path.

### Tests

**[tests/tools.unit.test.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/tests/tools.unit.test.ts)** — 16 tests using `msw` to intercept global `fetch`. Covers: header contract, per-tool request-body shape, fenced JSON tolerance, malformed JSON fallback, `<think>` splitting, thinking-off path, 429 retry, 500 surfaces `isError`, and timeout aborts without hanging. Runs in CI unconditionally.

**[tests/live.postman.test.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/tests/live.postman.test.ts)** — 10 tests gated by `ZEROGPU_LIVE=1` that exercise every tool against the real backend, mirroring the assertions from the original Postman collection. Skipped by default so CI never hits production.

---

## Tools exposed by the MCP server

All nine tools return a JSON object shaped roughly like `{ <task-specific fields>, model, usage, savings, raw? }`. `savings` is the cost-delta estimate; `raw` is present only when the underlying model returned something the tool couldn't parse cleanly.

| Tool | Purpose | Underlying model |
|---|---|---|
| `zerogpu_health` | Ping the backend. | — |
| `zerogpu_classify_iab` | IAB topic classification. `enriched: true` swaps to the richer taxonomy. | `zlm-v1-iab-classify-edge[-enriched]` |
| `zerogpu_summarize` | Summarize a passage. Prepends `"summarize: "` to user content as T5 expects. | `t5-small` |
| `zerogpu_classify_zero_shot` | Flat-label classification. `labels: string[]`, optional `threshold` filters the output. | `deberta-v3-small` |
| `zerogpu_extract_entities` | NER over a label list. | `gliner2-base-v1` (`usecase: "ner"`) |
| `zerogpu_extract_json` | Structured JSON extraction from a field schema. | `gliner2-base-v1` (`usecase: "json"`) |
| `zerogpu_classify_structured` | Multi-axis classification from a grouped-label schema. | `gliner2-base-v1` (`usecase: "classification"`) |
| `zerogpu_generate_followups` | Generate follow-up questions about a passage. | `zlm-v1-followup-questions-edge` |
| `zerogpu_chat` | General-purpose chat; `thinking: true` routes to the reasoning model and splits `<think>…</think>` into a separate `reasoning` field. | `LFM2.5-1.2B-Instruct` / `-Thinking` |

---

## Quick start

You need:

- **Node.js 22.9+** (`node --version`) — required because the npm scripts use `--env-file-if-exists`, a flag added in Node 22.9.
- A **ZeroGPU project** — URL, API key, project ID.

```bash
cd plugins/zerogpu/mcp-servers/zerogpu-mcp
npm install
npm run build
cp .env.example .env           # then fill in the three required values
npm test                       # 16 unit tests, no network needed
```

After that, pick one path:

- **Use it from Claude Code** → [Installing the plugin locally in Claude Code](#installing-the-plugin-locally-in-claude-code)
- **Run it yourself locally** → [Running the server standalone](#running-the-server-standalone)
- **Host it on Cloudflare Workers** → [Hosting on Cloudflare Workers](#hosting-on-cloudflare-workers)

---

## Installing the plugin locally in Claude Code

Claude Code discovers plugins through **plugin marketplaces** — a directory with a `.claude-plugin/marketplace.json` manifest that lists one or more plugins. This repo already ships one at [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json), so the local install is five short steps.

Two separate places hold the three ZeroGPU secrets, each read by a different actor. You must populate both:

| File | Who reads it | When |
|---|---|---|
| [plugins/zerogpu/mcp-servers/zerogpu-mcp/.env](plugins/zerogpu/mcp-servers/zerogpu-mcp/.env) | Node's `--env-file-if-exists` flag baked into the npm scripts | When you run `npm start` / `npm run inspect` / `node dist/index.js` directly |
| `~/.claude/settings.json` → `env` object | Claude Code, which substitutes `${ZEROGPU_…}` in [plugin.json](plugins/zerogpu/.claude-plugin/plugin.json) before spawning the server | Every time Claude Code launches the plugin |

Vars already set in the process environment win — `--env-file-if-exists` never overrides them — so when Claude Code spawns the server it always uses `settings.json` values, and `.env` is purely a standalone-dev convenience.

### 1. Install dependencies and build

```bash
cd plugins/zerogpu/mcp-servers/zerogpu-mcp
npm install
npm run build
```

Claude Code launches the plugin by running `node dist/index.js`, so `dist/` must exist before you install.

### 2. Create `.env` at the package root

```bash
cp .env.example .env
# edit .env and fill in:
#   ZEROGPU_ORCHESTRATION_URL=https://api.your-zerogpu.tld
#   ZEROGPU_API_KEY=...
#   ZEROGPU_PROJECT_ID=...
```

Quick sanity check: `npm start` — you should see `{"kind":"zerogpu.boot","transport":"stdio"}` on stderr. Ctrl+C out; stdio is meant to be talked to over stdin.

### 3. Merge the same three values into `~/.claude/settings.json`

Open `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`) and add (or extend) an `env` key **alongside** your existing `permissions` / `model` / etc. — do not replace the whole file:

```json
{
  "permissions": { "...": "your existing permissions" },
  "model": "claude-opus-4-7",
  "env": {
    "ZEROGPU_ORCHESTRATION_URL": "https://api.your-zerogpu.tld",
    "ZEROGPU_API_KEY": "...",
    "ZEROGPU_PROJECT_ID": "..."
  }
}
```

Keeping the values identical to the `.env` file is the only requirement.

### 4. Register the marketplace and install the plugin

Inside a Claude Code session, paste these two slash commands (substitute the repo path):

```
/plugin marketplace add c:\Users\<you>\path\to\mcp-example
/plugin install zerogpu@zerogpu-local
```

`zerogpu-local` is the marketplace name defined in [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json); `zerogpu` is the plugin name.

### 5. Restart Claude Code

Close and reopen the CLI. Plugin registration and MCP-server spawning happen at session start. After restart:

- `/plugin` → `zerogpu` is listed as enabled.
- `/mcp` → the `zerogpu` server is shown connected with nine tools.
- Ask Claude *"Run the zerogpu health tool"* — it should call `mcp__zerogpu__zerogpu_health` and return the upstream status.

### Changing the secrets later

Edit both [.env](plugins/zerogpu/mcp-servers/zerogpu-mcp/.env) and `~/.claude/settings.json` → `env`. Restart Claude Code to pick up the new values on its side (the MCP server is re-spawned on session start).

---

## Running the server standalone

For development, porting, or adding a new tool you can exercise the MCP server outside Claude Code. There are two runtimes — pick whichever matches what you're iterating on.

### stdio (Node — same mode Claude Code uses)

Easiest way to poke it by hand is the MCP Inspector:

```bash
cd plugins/zerogpu/mcp-servers/zerogpu-mcp
npm run inspect
# opens http://127.0.0.1:6274 — "List Tools", pick one, invoke it
```

If Inspector lists nine tools and one returns a payload, the server is healthy. Both `npm start` and `npm run inspect` use `node --env-file-if-exists=.env` under the hood, so they pick up your `.env` automatically (and no-op quietly if it's missing).

### HTTP (Cloudflare Workers — same runtime the hosted deploys use)

`wrangler dev` runs the Worker entry [src/worker.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/worker.ts) in a local Workers sandbox, with Durable Objects and all. Put the three ZeroGPU creds *and* `ZEROGPU_MCP_BEARER` in your `.env`, then:

```bash
cd plugins/zerogpu/mcp-servers/zerogpu-mcp
npm run worker:dev
# Worker available at http://127.0.0.1:8787
```

Verify — every MCP session starts with `initialize`:

```bash
BEARER="$(grep ZEROGPU_MCP_BEARER .env | cut -d= -f2)"
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "authorization: Bearer $BEARER" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

Grab the `mcp-session-id` response header and send it on every follow-up:

```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "authorization: Bearer $BEARER" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'mcp-session-id: <from-previous-response>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

If the Worker is reachable, `tools/list` enumerates the nine `zerogpu_*` tools.

---

## Hosting on Cloudflare Workers

The server ships with a first-class Cloudflare Worker entry point — same tool code, different edges. The worker wraps the shared `registerTools()` helper in a Durable Object via the `agents` package's `McpAgent`, and exposes it behind a bearer-guarded `/mcp` HTTP route.

### Architecture

```
                       ┌─────────────────────────── Cloudflare ────────────────────────────┐
                       │                                                                    │
Claude Code ──HTTP──▶  │  fetch(...)                                                        │
                       │    ├─ bearer check   ──► 401 if header mismatch                    │
                       │    └─ ZeroGpuMcp.serve("/mcp")                                     │
                       │         └─ Durable Object (ZeroGpuMcp extends McpAgent)            │
                       │              ├─ init(): build ZeroGpuClient, registerTools()       │
                       │              └─ JSON-RPC session state (SQLite-backed)             │
                       │                                                                    │
                       └──────────────────────────────┬─────────────────────────────────────┘
                                                      │
                                                      ▼
                                             ZeroGPU Orchestration API
```

Files in play:

- [src/worker.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/worker.ts) — `ZeroGpuMcp extends McpAgent` plus the `default fetch` bearer guard.
- [wrangler.toml](plugins/zerogpu/mcp-servers/zerogpu-mcp/wrangler.toml) — one local profile plus three deployable environments (`develop`, `staging`, `production`). Each env declares its own Worker name, Durable Object binding, and SQLite migration tag.
- [src/server.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/server.ts) — the `registerTools(server, client)` helper the Worker shares with the Node/stdio entry.

Everything under [src/tools/](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/tools/), plus [src/zerogpuClient.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/zerogpuClient.ts), [src/modelCatalog.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/modelCatalog.ts), [src/parsers.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/parsers.ts), and [src/savings.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/src/savings.ts) is runtime-agnostic and runs unchanged in both the Node and Worker paths. `savings.ts` picks `process.stderr` on Node and falls back to `console.log` (Workers log stream) on the Worker.

### What you must set up on Cloudflare (one time per account)

None of this is done by `wrangler deploy` — it's the prerequisite state the deploy assumes already exists.

1. **Cloudflare account + Workers paid plan** — Durable Objects require the Workers Paid plan ($5/month) or higher. The free plan will accept the `wrangler deploy` but the DO binding will error at runtime.
2. **Workers subdomain** — from the Cloudflare dashboard ▸ Workers & Pages ▸ Overview, make sure your account has a `*.workers.dev` subdomain claimed. This is where the three deployed workers will live:
   - `https://zerogpu-mcp-develop.<your-subdomain>.workers.dev`
   - `https://zerogpu-mcp-staging.<your-subdomain>.workers.dev`
   - `https://zerogpu-mcp.<your-subdomain>.workers.dev`
3. **Account ID** — dashboard ▸ Workers & Pages ▸ any Worker ▸ right-hand sidebar, copy **Account ID**.
4. **API token for deploys** — dashboard ▸ My Profile ▸ API Tokens ▸ **Create Token** ▸ template *"Edit Cloudflare Workers"*. Scope it to your account. You'll drop this into GitHub Actions secrets below.
5. **Per-env secrets** — from a machine with `wrangler` logged in (`wrangler login`), set the four secrets **once per environment**. Repeat for `staging` and `production`:

   ```bash
   cd mcp-example/plugins/zerogpu/mcp-servers/zerogpu-mcp
   wrangler secret put ZEROGPU_ORCHESTRATION_URL --env develop
   wrangler secret put ZEROGPU_API_KEY           --env develop
   wrangler secret put ZEROGPU_PROJECT_ID        --env develop
   wrangler secret put ZEROGPU_MCP_BEARER        --env develop   # long random string; MCP clients present it as Authorization: Bearer …
   ```

   Secrets are encrypted at rest and are never emitted in `wrangler.toml` or `git`. Rotate any of them with another `wrangler secret put`.
6. **GitHub Actions secrets** — in the GitHub repo settings ▸ Secrets and variables ▸ Actions, add:
   - `CLOUDFLARE_API_TOKEN` — the token from step 4.
   - `CLOUDFLARE_ACCOUNT_ID` — the ID from step 3.

That's everything. The first `wrangler deploy --env <name>` (either from your laptop or from CI) will apply the SQLite migration, create the Durable Object, and publish the Worker.

### Deploy pipeline (GitHub Actions)

The three workflows under [.github/workflows](../.github/workflows) mirror the `orchestration-api` layout:

| Workflow | Trigger | Target |
|---|---|---|
| [ci.yml](../.github/workflows/ci.yml) | Pull requests to `dev` or `main` | `npm test` + Worker type-check. Does *not* deploy. |
| [deploy-dev.yml](../.github/workflows/deploy-dev.yml) | Push to `dev` | `wrangler deploy --env develop` |
| [deploy-staging.yml](../.github/workflows/deploy-staging.yml) | Push to `main` | `wrangler deploy --env staging` |
| [deploy-prod.yml](../.github/workflows/deploy-prod.yml) | Published GitHub Release | `wrangler deploy --env production` |

Each deploy workflow uses `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from repo secrets; the ZeroGPU secrets are pulled from Cloudflare (not GitHub) because they were set via `wrangler secret put`.

### Deploying by hand

The same thing, without CI:

```bash
cd mcp-example/plugins/zerogpu/mcp-servers/zerogpu-mcp
npm install
npm test

npm run deploy:develop      # → zerogpu-mcp-develop.<subdomain>.workers.dev
npm run deploy:staging      # → zerogpu-mcp-staging.<subdomain>.workers.dev
npm run deploy:production   # → zerogpu-mcp.<subdomain>.workers.dev
```

`wrangler` reads `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` from your shell env, or falls back to the interactive `wrangler login` session.

### Smoke-testing a deployed Worker

```bash
curl -s https://zerogpu-mcp-develop.<subdomain>.workers.dev/health
# → {"status":"ok","env":"develop"}

curl -s -X POST https://zerogpu-mcp-develop.<subdomain>.workers.dev/mcp \
  -H "authorization: Bearer <ZEROGPU_MCP_BEARER-you-set>" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

`/health` returns 200 without a bearer; `/mcp` refuses anything that isn't `Authorization: Bearer <bearer>` with 401.

### Pointing Claude Code at the hosted Worker

Two paths — pick one, don't mix them. 

**Path A — remote MCP only (most Claude Code users will want this):**

```bash
claude mcp add --transport http zerogpu \
  https://zerogpu-mcp-develop.<subdomain>.workers.dev/mcp \
  --header "Authorization: Bearer <ZEROGPU_MCP_BEARER-value>"
```

You can still install the local plugin from the marketplace to pick up the **skill** (pure prose guidance — doesn't care whether the tools are local or remote). If you do, edit [plugin.json](plugins/zerogpu/.claude-plugin/plugin.json) and remove the `mcpServers` block so Claude Code doesn't spawn a local stdio process alongside your remote registration.

**Path B — local stdio plugin only:**

Use the [Installing the plugin locally in Claude Code](#installing-the-plugin-locally-in-claude-code) flow. No Worker involved.

### Testing the hosted MCP server from Claude Code

Once Path A is registered, restart Claude Code and verify in the CLI:

1. `/mcp` → the `zerogpu` server should appear connected; expanding it lists the nine tools.
2. Ask Claude: *"Run the zerogpu health tool."* → it calls `mcp__zerogpu__zerogpu_health`, which round-trips through the Worker to the ZeroGPU backend and returns the upstream status.
3. Paste a paragraph and say *"Summarize this."* → the skill's guidance should steer the model to `mcp__zerogpu__zerogpu_summarize`. The reply arrives through the Worker, and each call emits a savings JSON line into the Worker's logs (see Cloudflare dashboard ▸ Workers & Pages ▸ `zerogpu-mcp-<env>` ▸ Logs).
4. Try each environment: register `zerogpu-dev` / `zerogpu-staging` / `zerogpu-prod` with different names (and different `ZEROGPU_MCP_BEARER` values) to keep them side-by-side in `/mcp`.

If `/mcp` shows `zerogpu` as connected but tool calls return `isError: true` with a 401, the bearer stored in `claude mcp add`'s header no longer matches the Worker's `ZEROGPU_MCP_BEARER` secret — rotate one of them so they match. If tool calls return a 500 with `"server misconfigured"`, the secret was never set; re-run `wrangler secret put ZEROGPU_MCP_BEARER --env <name>`.

---

## Verifying it works

1. **Unit tests pass locally**: `npm test` → 16 passed, 10 skipped.
2. **MCP Inspector lists nine tools**: `npm run inspect`, connect, List Tools.
3. **Health in Claude Code**: ask Claude `run the zerogpu health tool`. It should call `mcp__zerogpu__zerogpu_health` and reply with the backend status.
4. **Skill triggers**: paste a paragraph and say *"Summarize this."* — Claude should invoke `zerogpu_summarize`, not write the summary itself. Then say *"Is this tech, politics, or sports?"* — expect `zerogpu_classify_zero_shot`.
5. **Savings log**: every tool call writes one JSON line to stderr like `{"kind":"zerogpu.savings","tool":"zerogpu_summarize","model":"t5-small","input_tokens":42,"output_tokens":11,"savings_usd":0.0008,"latency_ms":230}`. Check the plugin log in Claude Code or the server's stderr stream.

---

## Troubleshooting

- **"Missing required env vars" at startup (stdio)** — the server refuses to start without `ZEROGPU_ORCHESTRATION_URL`, `ZEROGPU_API_KEY`, and `ZEROGPU_PROJECT_ID`. Check [plugin.json](plugins/zerogpu/.claude-plugin/plugin.json)'s `env` block is resolving from your Claude Code settings.
- **"Missing required secrets" at Worker cold start** — the same three creds were never set on that environment. Run `wrangler secret put <NAME> --env <env>` for each missing one.
- **Worker returns 500 with `"server misconfigured: ZEROGPU_MCP_BEARER secret not set"`** — the bearer secret is missing on that environment. Set it: `wrangler secret put ZEROGPU_MCP_BEARER --env <env>`.
- **Worker returns 401 on every `/mcp` call** — the `Authorization: Bearer …` header your client sends doesn't match the Worker's `ZEROGPU_MCP_BEARER` secret. Rotate one so they match (update either `wrangler secret put` or the `--header` passed to `claude mcp add`).
- **`wrangler deploy` fails with "Durable Object bindings require migrations"** — the environment is missing its `[[env.<name>.migrations]]` block. The committed [wrangler.toml](plugins/zerogpu/mcp-servers/zerogpu-mcp/wrangler.toml) declares them for all three envs; if you edited it locally, add it back.
- **All tools return `isError: true` with a 401/403 from the backend** — credentials are reaching the server but the ZeroGPU backend rejects them. Re-check `ZEROGPU_API_KEY` and `ZEROGPU_PROJECT_ID` against the Postman collection.
- **Claude doesn't call any `zerogpu_*` tool even though the task fits** — confirm the skill loaded (`/plugin` lists `zerogpu` as enabled) and the MCP server is connected (`/mcp` shows it green). If both look fine, the model may have judged the task too complex; the skill's "when NOT to use it" section is deliberately conservative.
- **Inspector shows the server but zero tools** — the build is stale. Run `npm run build` in the mcp-server directory, then restart Claude Code (or Inspector).
- **Tests fail with "unhandled request"** — MSW only mocks what the tests register; if you change `zerogpuClient.ts` to hit a new path, add a matching handler in [tests/tools.unit.test.ts](plugins/zerogpu/mcp-servers/zerogpu-mcp/tests/tools.unit.test.ts).
- **GitHub Actions deploy fails with `Error: Authentication error`** — `CLOUDFLARE_API_TOKEN` in repo secrets is missing, wrong, or its scope doesn't cover Workers Scripts. Regenerate from the *Edit Cloudflare Workers* template.
