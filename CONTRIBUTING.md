# Contributing

Thanks for helping improve ZeroGPU MCP.

## Development Setup

Use Node.js 22 or newer.

```bash
npm install --prefix mcp-server
npm install --prefix agents/openclaw/plugin
```

Run the main checks before opening a pull request:

```bash
npm run release:check
```

Or run the packages independently:

```bash
npm --prefix mcp-server run build
npm --prefix mcp-server run worker:types
npm --prefix mcp-server test
npm --prefix agents/openclaw/plugin run build
```

## Repository Layout

- `mcp-server/` contains the TypeScript MCP server shared by Node stdio and Cloudflare Workers.
- `agents/openclaw/` contains the OpenClaw skill and plugin package.
- `agents/claude/` contains the Claude Code marketplace plugin + skill.
- `mcp-server/config/catalog.json` is the source of truth for tool descriptions, model routing, and pricing.

## Pull Request Guidelines

- Keep runtime behavior and documentation changes clearly separated when possible.
- Add or update tests for changes to tool handlers, request payloads, parsing, retries, or savings calculations.
- Do not commit generated build output, `.env` files, populated MCP credential JSON, Cloudflare local state, or real API credentials.
- If `mcp-server/config/catalog.json` changes, mention which environments need KV reseeding with `npm run kv:seed:<env>`.

## Live Tests

Live tests hit the real ZeroGPU backend and are skipped by default.

```bash
ZEROGPU_LIVE=1 npm --prefix mcp-server test
```

They require `ZEROGPU_ORCHESTRATION_URL`, `ZEROGPU_API_KEY`, and `ZEROGPU_PROJECT_ID`.
