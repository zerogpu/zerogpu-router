# ZeroGPU Router

> Cut your OpenClaw agent's inference costs. Route trivial AI tasks — summarize, classify, redact PII, extract JSON, generate follow-ups, short chat — to small/nano models instead of burning frontier-model tokens.

[![Website](https://img.shields.io/badge/website-zerogpu.ai-22c55e)](https://zerogpu.ai)
[![Dashboard](https://img.shields.io/badge/dashboard-platform.zerogpu.ai-blue)](https://platform.zerogpu.ai)
[![License](https://img.shields.io/badge/license-MIT-yellow)](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE)

## What it does

Your OpenClaw agent keeps doing the heavy reasoning. Routine tasks get offloaded to ZeroGPU's small models — typically 100–1000× cheaper per call.

- 11 task-specific MCP tools (`zerogpu_summarize`, `zerogpu_classify_iab`, `zerogpu_redact_pii`, …)
- A routing skill that teaches your agent **when** to call each tool
- Per-call savings logged with model, latency, and a real `savings_usd` figure
- Hosted MCP server at `https://mcp.zerogpu.ai/mcp` — no infra to run

## Install

**From npm** (after the maintainer runs `npm publish` — see [RELEASE.md](../../../RELEASE.md)):

```bash
openclaw plugins install npm:zerogpu-openclaw-plugin
```

**From this repo** (no npm needed):

```bash
git clone https://github.com/zerogpu/zerogpu-router.git
cd zerogpu-router/agents/openclaw/plugin
npm ci && npm run build
openclaw plugins install ./
```

## Set up (2 steps)

### 1. Get your API key

Sign in at [platform.zerogpu.ai](https://platform.zerogpu.ai) and create a project to grab an API key + project ID.

### 2. Register the hosted MCP server

In your OpenClaw shell:

```bash
openclaw mcp set zerogpu '{
  "url": "https://mcp.zerogpu.ai/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "<your-api-key>",
    "x-project-id": "<your-project-id>"
  }
}'
```

Verify:

```bash
openclaw mcp show zerogpu --json
```

That's it. Your agent will now route trivial tasks through ZeroGPU automatically.

## Try it

Ask your agent:

```text
summarize this paragraph: Renewable energy adoption is accelerating globally, driven by falling solar and wind costs.
```

The agent calls `zerogpu_summarize` (running on `t5-small`) instead of the host model and replies with the summary plus a savings line.

## The 11 tools you get

| Tool | Workload | Backing model |
|---|---|---|
| `zerogpu_classify_iab` | IAB topic classification | `zlm-v1-iab-classify-edge` |
| `zerogpu_summarize` | TL;DRs, abstracts, meeting summaries | `t5-small` |
| `zerogpu_classify_zero_shot` | Classify against a flat label list | `deberta-v3-small` |
| `zerogpu_extract_entities` | People, places, companies, dates, custom entities | `gliner2-base-v1` |
| `zerogpu_extract_json` | Pull structured fields into grouped JSON | `gliner2-base-v1` |
| `zerogpu_classify_structured` | Multi-axis schema classification | `gliner2-base-v1` |
| `zerogpu_redact_pii` | Mask emails, phones, names, addresses, other PII | `gliner-multi-pii-v1` |
| `zerogpu_extract_pii` | Extract PII grouped by category | `gliner-multi-pii-v1` |
| `zerogpu_generate_followups` | Generate follow-up questions from a passage | `zlm-v1-followup-questions-edge` |
| `zerogpu_chat` | Short small-model chat replies | `LFM2.5-1.2B-Instruct` / `-Thinking` |
| `zerogpu_health` | Verify the ZeroGPU backend | — |

Every tool returns `{ <task fields>, model, usage, savings }`.

## Watch your savings

Live dashboard at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** — token usage, latency, per-tool savings, broken down by agent and time range.

## Links

- Website: <https://zerogpu.ai>
- Dashboard: <https://platform.zerogpu.ai>
- Source: <https://github.com/zerogpu/zerogpu-router>
- Full setup guide: <https://github.com/zerogpu/zerogpu-router/tree/main/agents/openclaw>
- Issues / contact: <hello@zerogpu.ai>

## License

MIT — see [LICENSE](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE).
