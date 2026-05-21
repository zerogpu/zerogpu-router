# Claude Code

Use these exact steps in Claude Code.

## Connect to MCP

1. Open Claude Code (terminal or VS Code extension).
2. Add the ZeroGPU MCP server:

```sh
claude mcp add --transport http zerogpu-router https://mcp.zerogpu.ai/mcp \
  --header "x-api-key: zgpu-api-…" \
  --header "x-project-id: 4ed3e5bb-c2ed-4d4a-8a66-2b161a27fd1a"
```

3. Restart Claude session.

## Verify MCP connection

Run:

```sh
claude mcp list
```

Expected output:

```text
zerogpu: https://mcp.zerogpu.ai/mcp (HTTP) - ✓ Connected
```

## Add routing intelligence

### Plugin (recommended)

```text
/plugin marketplace add https://github.com/zerogpu/ZeroGPU-Router
/plugin install zerogpu-router
/plugin
```

Expected plugin output includes:

```text
zerogpu-router — enabled
```

## Commands

The plugin ships these slash commands (in addition to the model-invoked `zerogpu-router` skill):

| Command | Purpose |
| --- | --- |
| `/zerogpu-router:health` | Verify the ZeroGPU MCP backend is reachable |
| `/zerogpu-router:classify <text>` | Route classification through ZeroGPU |
| `/zerogpu-router:summarize <text>` | Route summarization through ZeroGPU |
| `/zerogpu-router:extract <text>` | Route entity/JSON extraction through ZeroGPU |
| `/zerogpu-router:redact <text>` | Route PII redaction through ZeroGPU |
