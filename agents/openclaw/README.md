# OpenClaw

Use these commands in an OpenClaw terminal to install and connect ZeroGPU Router.

## 1) Install the plugin

```sh
openclaw plugins install npm:zerogpu-openclaw-plugin
```

Optional: pin a version — `openclaw plugins install npm:zerogpu-openclaw-plugin@0.1.10`.

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
