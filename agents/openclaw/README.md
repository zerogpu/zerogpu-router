# OpenClaw

Use these commands in an OpenClaw terminal to install and connect ZeroGPU Router.

## 1) Install the plugin

**npm (simplest):**

```sh
openclaw plugins install npm:zerogpu-openclaw-plugin
```

Optional pin: `npm:zerogpu-openclaw-plugin@0.1.10`.

**GitHub** — plugin path is `agents/openclaw/plugin/` in [zerogpu/zerogpu-router](https://github.com/zerogpu/zerogpu-router) (not repo root; do not use `git:github.com/zerogpu/zerogpu-router@main` alone):

```sh
tmpdir=$(mktemp -d)
git clone --depth 1 -b main https://github.com/zerogpu/zerogpu-router.git "$tmpdir/repo"
(cd "$tmpdir/repo/agents/openclaw/plugin" && npm ci && npm run build)
openclaw plugins install "$tmpdir/repo/agents/openclaw/plugin"
```

## 2) Connect OpenClaw to MCP

```sh
openclaw mcp set zerogpu '{
  "url": "https://mcp.zerogpu.ai/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "zgpu-api-…",
    "x-project-id": "id"
  }
}'
```

## 3) Restart gateway

```sh
openclaw gateway restart
```
