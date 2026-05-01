# openclaw-plugin-zerogpu

OpenClaw plugin and skill for routing cheap plain-text AI tasks to the ZeroGPU MCP server.

## Install From Source

```bash
npm install
npm run build
openclaw plugins install ./
```

Register the remote MCP server separately:

```bash
openclaw mcp set zerogpu '{
  "url": "https://<your-worker>/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "<your-api-key>",
    "x-project-id": "<your-project-id>"
  }
}'
```

See `../README.md` in the repository for the full OpenClaw setup and verification flow.
