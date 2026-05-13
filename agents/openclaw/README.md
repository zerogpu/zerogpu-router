# OpenClaw

Use these exact commands in an OpenClaw terminal to install and connect ZeroGPU Router.

## 1) Run on OpenClaw terminal

```sh
tmpdir=$(mktemp -d) && cd "$tmpdir" \
  && npm pack zerogpu-openclaw-plugin@0.1.10 \
  && tar -xzf zerogpu-openclaw-plugin-*.tgz \
  && cd package \
  && openclaw plugins install ./
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
