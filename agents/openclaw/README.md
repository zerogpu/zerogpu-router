# OpenClaw

Routes cheap plain-text workloads from OpenClaw to the hosted ZeroGPU Router at `https://mcp.zerogpu.ai/mcp`. Mirrors the Claude Code packaging in [`../claude/`](../claude/). Manage API keys and watch live savings at [platform.zerogpu.ai](https://platform.zerogpu.ai).

## Choose an install shape

| Option | Use when | Location |
|---|---|---|
| **Skill (drop-in)** | You want only routing guidance + will manage plugin wiring yourself | [`plugin/skills/zerogpu/`](./plugin/skills/zerogpu/) (`SKILL.md`) |
| **Native plugin package** | You want OpenClaw to load skill + manifest from npm/ClawHub or `plugins install ./` | [`plugin/`](./plugin/) (`package.json`, `openclaw.plugin.json`) |
| **MCP registration JSON** | You need a paste-ready `openclaw mcp set` payload | [`mcp/zerogpu-server.json`](./mcp/zerogpu-server.json) |

You always register the remote MCP server (Step 1 below) so `zerogpu_*` tools exist.

## Layout

```
agents/openclaw/
├── mcp/zerogpu-server.json     # example payload for `openclaw mcp set`
└── plugin/
    ├── package.json             # Node 22+, OpenClaw metadata + build
    ├── openclaw.plugin.json     # manifest (declares skills)
    ├── src/index.ts             # `definePluginEntry`
    └── skills/zerogpu/SKILL.md  # routing guidance
```

## Prerequisites

You need a ZeroGPU API key and project ID. Both are passed inline as headers when registering the server — no environment variables required.

## Step 1 — Register the remote MCP server (required for both install forms)

OpenClaw registers MCP servers via `openclaw mcp set <name> '<json>'` — there is no `mcp add` subcommand or `--transport` flag, so credentials and transport go inside the JSON payload. Pass your API key and project ID inline as headers (no env vars needed):

```sh
openclaw mcp set zerogpu '{
  "url": "https://mcp.zerogpu.ai/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "<your-api-key>",
    "x-project-id": "<your-project-id>"
  }
}'

openclaw mcp show zerogpu --json   # verify
```

Or fill in [`mcp/zerogpu-server.json`](./mcp/zerogpu-server.json) with literal values and apply it from the file (paths below assume repo root):

```sh
openclaw mcp set zerogpu "$(cat agents/openclaw/mcp/zerogpu-server.json)"
```

Either form stores the server under `mcp.servers.zerogpu` in your OpenClaw config and sends the headers verbatim on every request. The values land in your local OpenClaw config, so treat that file as a secret and don't commit a populated `zerogpu-server.json`.

## Step 2 — Install skill or plugin

Pick one of the two forms below.

### Form A: bare skill folder (drop-in)

Copy the skill folder into your OpenClaw workspace, **or** add the path to `skills.load.extraDirs` in `~/.openclaw/openclaw.json`.

```sh
# Option 1 — copy
cp -R agents/openclaw/plugin/skills/zerogpu ~/.openclaw/workspace/skills/

# Option 2 — register the parent as an extra skill dir
#   add this to ~/.openclaw/openclaw.json:
#   { "skills": { "load": { "extraDirs": ["/abs/path/to/zerogpu-router/agents/openclaw/plugin/skills"] } } }
```

Then verify:

```sh
openclaw skills list      # should show "zerogpu"
```

### Form B: full plugin package

Build and install locally:

```sh
cd agents/openclaw/plugin
npm install
npm run build
openclaw plugins install ./
openclaw plugins list     # should show "zerogpu-router"
```

Or, after publishing to ClawHub:

```sh
openclaw plugins install zerogpu-router
```

## Verifying end-to-end

Start an OpenClaw agent session and try each pattern — the agent should call the matching `zerogpu_*` MCP tool instead of answering with the host model:

| Prompt | Expected MCP tool |
|---|---|
| `summarize this paragraph: <text>` | `zerogpu_summarize` |
| `is this email about tech, politics, or sports? <email>` | `zerogpu_classify_zero_shot` |
| `pull the names and companies out of this: <text>` | `zerogpu_extract_entities` |
| `redact the PII in this: <text>` | `zerogpu_redact_pii` |
| `what follow-up questions should I ask about this? <text>` | `zerogpu_generate_followups` |

Negative check: ask for code or multi-step reasoning — the agent should **not** call any `zerogpu_*` tool.

If routing fails, run `openclaw mcp show zerogpu --json` to confirm the server is registered and the `x-api-key` / `x-project-id` headers carry the expected values.
