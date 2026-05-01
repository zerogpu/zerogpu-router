# OpenClaw ZeroGPU plugin

OpenClaw skill + plugin that routes cheap AI tasks (classification, summarization, entity/JSON extraction, PII redact/extract, follow-up generation, small-model chat) from your OpenClaw agent to the [ZeroGPU MCP server](../mcp-server). Mirrors the Claude Code plugin in [`../claude-plugin`](../claude-plugin).

## Layout

```
openclaw-plugin/
├── mcp/zerogpu-server.json          # config payload for `openclaw mcp set`
└── plugin/
    ├── package.json                 # Node 22+, has `openclaw` block
    ├── openclaw.plugin.json         # plugin manifest (declares skills)
    ├── tsconfig.json
    ├── src/index.ts                 # `definePluginEntry` (skills load declaratively)
    └── skills/zerogpu/SKILL.md      # the routing skill (single source of truth)
```

## Prerequisites

You need a ZeroGPU API key and project ID. Both are passed inline as headers when registering the server — no environment variables required.

## Step 1 — Register the remote MCP server (required for both install forms)

OpenClaw registers MCP servers via `openclaw mcp set <name> '<json>'` — there is no `mcp add` subcommand or `--transport` flag, so credentials and transport go inside the JSON payload. Pass your API key and project ID inline as headers (no env vars needed):

```sh
openclaw mcp set zerogpu '{
  "url": "https://<your-worker-host>/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "<your-api-key>",
    "x-project-id": "<your-project-id>"
  }
}'

openclaw mcp show zerogpu --json   # verify
```

Or fill in [`mcp/zerogpu-server.json`](./mcp/zerogpu-server.json) with literal values and apply it from the file:

```sh
openclaw mcp set zerogpu "$(cat openclaw-plugin/mcp/zerogpu-server.json)"
```

Either form stores the server under `mcp.servers.zerogpu` in your OpenClaw config and sends the headers verbatim on every request. The values land in your local OpenClaw config, so treat that file as a secret and don't commit a populated `zerogpu-server.json`.

## Step 2 — Install the skill

Pick one of the two forms below.

### Form A: bare skill folder (drop-in)

Copy the skill folder into your OpenClaw workspace, **or** add the path to `skills.load.extraDirs` in `~/.openclaw/openclaw.json`.

```sh
# Option 1 — copy
cp -R openclaw-plugin/plugin/skills/zerogpu ~/.openclaw/workspace/skills/

# Option 2 — register the parent as an extra skill dir
#   add this to ~/.openclaw/openclaw.json:
#   { "skills": { "load": { "extraDirs": ["/abs/path/to/openclaw-plugin/plugin/skills"] } } }
```

Then verify:

```sh
openclaw skills list      # should show "zerogpu"
```

### Form B: full plugin package

Build and install locally:

```sh
cd openclaw-plugin/plugin
npm install
npm run build
openclaw plugins install ./
openclaw plugins list     # should show "zerogpu"
```

Or, after publishing to ClawHub:

```sh
openclaw plugins install openclaw-plugin-zerogpu
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
