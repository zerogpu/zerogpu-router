# Contributing

Thanks for helping improve ZeroGPU Router.

This repository hosts the **agent-side integrations** — the routing skills and plugins that connect Claude Code and OpenClaw to the hosted ZeroGPU Router. The Router itself runs at `https://mcp.zerogpu.ai/mcp` and is operated by ZeroGPU.

## Development Setup

Use Node.js 22 or newer.

```bash
npm install --prefix agents/openclaw/plugin
```

Run the main checks before opening a pull request:

```bash
npm run release:check
```

Or build the OpenClaw plugin directly:

```bash
npm --prefix agents/openclaw/plugin run build
```

## Repository Layout

- `agents/claude/` — Claude Code marketplace plugin + routing skill.
- `agents/openclaw/` — OpenClaw plugin (`zerogpu-router`) + drop-in skill + MCP registration JSON.
- `agents/<agent>/.../SKILL.md` — the routing guidance each agent loads.

## Pull Request Guidelines

- Keep runtime behavior changes and documentation changes clearly separated when possible.
- Update both `agents/claude/.../SKILL.md` and `agents/openclaw/plugin/skills/zerogpu/SKILL.md` together when changing the routing rules — the two skills are intentionally kept in sync.
- Do not commit generated build output, `.env` files, populated MCP credential JSON, or real API credentials.
- If you change the OpenClaw plugin's manifest or skill, bump the version in `agents/openclaw/plugin/package.json` and `agents/openclaw/plugin/openclaw.plugin.json`.

## Testing changes end-to-end

To smoke-test a routing change locally:

1. Get an API key and project ID at [platform.zerogpu.ai](https://platform.zerogpu.ai).
2. Register the hosted Router with your agent (see the [root README](README.md#quick-start)).
3. Install the plugin from this branch (`openclaw plugins install ./` or the Claude marketplace path).
4. Run a few prompts and confirm the agent calls the expected `zerogpu_*` tool.
