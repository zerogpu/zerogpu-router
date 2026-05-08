# zerogpu-mcp

MCP server for the ZeroGPU Orchestration API. It exposes task-focused tools for low-cost classification, summarization, entity/JSON extraction, PII redaction/extraction, follow-up generation, and small-model chat.

This package can run locally over stdio or as a Cloudflare Worker MCP endpoint.

## Local Stdio

```bash
npm install
npm run build
ZEROGPU_ORCHESTRATION_URL=https://api.example.zerogpu.ai \
ZEROGPU_API_KEY=<your-api-key> \
ZEROGPU_PROJECT_ID=<your-project-id> \
node dist/index.js
```

## Cloudflare Worker

```bash
npm install
npm run worker:types
npm run kv:seed:develop
npm run deploy:develop
```

The Worker stores only `ZEROGPU_ORCHESTRATION_URL` as a secret. MCP clients send `x-api-key` and `x-project-id` headers on each `/mcp` request.

See the repository README for OpenClaw and Claude Code setup.
