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

## Skills

The plugin ships one skill per `zerogpu` CLI command. Inference skills auto-invoke when the user's request matches (e.g. "summarize this …"), and every skill can also be triggered manually with `/<skill-name>`.

| Skill | Purpose |
| --- | --- |
| `/zerogpu-router:login` | Sign in and persist API key + Project ID (manual only) |
| `/zerogpu-router:status` | Show current sign-in status (manual only) |
| `/zerogpu-router:chat <text>` | Short chat reply via `LFM2.5-1.2B-Instruct` |
| `/zerogpu-router:chat-thinking <text>` | Chat with the Thinking variant (returns reasoning) |
| `/zerogpu-router:classify-iab <text>` | IAB taxonomy classification |
| `/zerogpu-router:classify-iab-enriched <text>` | IAB + topics/keywords/intent |
| `/zerogpu-router:classify-zero-shot <text> -l …` | Zero-shot against custom labels |
| `/zerogpu-router:classify-structured <text> -s '…'` | Schema-based multi-axis classification |
| `/zerogpu-router:extract-entities <text> -l …` | Custom-label NER |
| `/zerogpu-router:extract-pii <text>` | Extract PII entities |
| `/zerogpu-router:redact-pii <text>` | Mask PII in-line in the text |
| `/zerogpu-router:extract-json <text> -s '…'` | Schema-driven JSON extraction |
| `/zerogpu-router:summarize <text>` | Summarize with `t5-small` |
| `/zerogpu-router:generate-followups <text>` | Generate follow-up questions |

Each skill wraps the corresponding `zerogpu` CLI command — see [`docs/DOCUMENTATION.md`](../../docs/DOCUMENTATION.md) for flags and examples.
