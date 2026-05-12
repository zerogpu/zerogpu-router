# ZeroGPU Router

Cut your AI costs. Route trivial tasks — summarize, classify, redact PII, extract JSON, generate follow-ups, short chat — to small/nano models instead of burning frontier-model tokens.

[![Beta](https://img.shields.io/badge/status-beta-blue)](README.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-plugin-black)](agents/openclaw/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-optional-lightgrey)](agents/claude/)

![ZeroGPU dashboard](assets/zerogpu-dashboard.gif)

## What is ZeroGPU Router?

ZeroGPU Router is a smart task router for AI agents. It exposes task-specific tools — summarize, classify, redact PII, extract JSON, and more — via the Model Context Protocol (MCP), backed by small language models that run for a fraction of the cost of a frontier model.

Your agent keeps doing the heavy reasoning. The boring stuff gets routed to ZeroGPU.

- **Plugs into OpenClaw** — register MCP + install **`zerogpu-openclaw-plugin`** (see [agents/openclaw/](agents/openclaw/)); package name and plugin `id` match.
- **Cheap by default** — small models for trivial work, frontier model untouched for everything else.
- **Per-call savings** — every routed task returns model, latency, and a real `savings_usd` figure.
- **Hosted, no infra** — point your agent at `https://mcp.zerogpu.ai/mcp`. We run the routing layer.

## OpenClaw quick start

You need a ZeroGPU API key and project ID. Grab them at [platform.zerogpu.ai](https://platform.zerogpu.ai).

Register the hosted MCP endpoint in OpenClaw:

```sh
openclaw mcp set zerogpu '{
  "url": "https://mcp.zerogpu.ai/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "<your-api-key>",
    "x-project-id": "<your-project-id>"
  }
}'
```

Install the OpenClaw plugin tarball from npm (published as [`zerogpu-openclaw-plugin`](https://www.npmjs.com/package/zerogpu-openclaw-plugin)):

```sh
tmpdir=$(mktemp -d) && cd "$tmpdir" && npm pack zerogpu-openclaw-plugin@0.1.8 && tar -xzf zerogpu-openclaw-plugin-*.tgz && cd package && openclaw plugins install ./
```

Connect OpenClaw to MCP:

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

Restart Gateway:

```sh
openclaw gateway restart
```

Try:

```text
summarize this paragraph: Renewable energy adoption is accelerating globally, driven by falling solar and wind costs.
```

The agent should call `zerogpu_summarize` and return a summary plus savings metadata.

<details>
<summary>Claude Code (optional)</summary>

Connect to MCP:

```sh
claude mcp add --transport http zerogpu-router \
  https://mcp.zerogpu.ai/mcp \
  --header "x-api-key: zgpu-api-…" \
  --header "x-project-id: 4ed3e5bb-c2ed-4d4a-8a66-2b161a27fd1a"
```

Restart Claude session, then verify:

```sh
claude mcp list
```

Expected:

```text
zerogpu: https://mcp.zerogpu.ai/mcp (HTTP) - ✓ Connected
```

Add routing intelligence with plugin:

```text
/plugin marketplace add https://github.com/zerogpu/ZeroGPU-Router
/plugin install zerogpu-router
/plugin
```

Or skill-only:

```sh
mkdir -p ~/.claude/skills/zerogpu
curl -o ~/.claude/skills/zerogpu/SKILL.md \
  https://raw.githubusercontent.com/zerogpu/zerogpu-router/main/agents/claude/plugins/zerogpu-router/skill/SKILL.md
```

</details>

## Cloud connection

Sign in at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** to:

- Generate API keys and project IDs
- Watch live token usage, latency, and routed-call savings on the dashboard
- See per-tool savings broken down by agent and time range
- Manage agents, billing, and team access
- Follow the step-by-step connect-your-agent guide (OpenClaw is documented in-repo; Claude Code lives under [agents/claude/](agents/claude/))

The hosted Router at `https://mcp.zerogpu.ai/mcp` is the one your agent talks to. The dashboard at `platform.zerogpu.ai` is where you see what it did.

## Routes

ZeroGPU Router exposes eleven task-specific routes:

| Route | Workload | Model |
|---|---|---|
| `zerogpu_classify_iab` | IAB topic classification | `zlm-v1-iab-classify-edge` |
| `zerogpu_summarize` | TL;DRs, abstracts, meeting note summaries | `t5-small` |
| `zerogpu_classify_zero_shot` | Classify against a flat label list | `deberta-v3-small` |
| `zerogpu_extract_entities` | Extract people, places, companies, dates, custom entities | `gliner2-base-v1` |
| `zerogpu_extract_json` | Pull structured fields into grouped JSON | `gliner2-base-v1` |
| `zerogpu_classify_structured` | Multi-axis schema classification | `gliner2-base-v1` |
| `zerogpu_redact_pii` | Mask emails, phones, names, addresses, other PII | `gliner-multi-pii-v1` |
| `zerogpu_extract_pii` | Extract PII grouped by category | `gliner-multi-pii-v1` |
| `zerogpu_generate_followups` | Generate follow-up questions from a passage | `zlm-v1-followup-questions-edge` |
| `zerogpu_chat` | Short small-model chat replies | `LFM2.5-1.2B-Instruct` / `-Thinking` |
| `zerogpu_health` | Verify ZeroGPU backend health | — |

Every route returns `{ <task fields>, model, usage, savings }`.

## Packages

| Package | Role |
|---|---|
| [agents/openclaw/](agents/openclaw/) | **Primary:** OpenClaw package + plugin id **`zerogpu-openclaw-plugin`** + skill + MCP registration JSON |
| [agents/claude/](agents/claude/) | Optional: Claude Code marketplace plugin + routing skill |

## Quick Links

- [OpenClaw setup](agents/openclaw/README.md)
- [Agent integrations index](agents/README.md)
- [Claude Code setup](agents/claude/README.md) (optional)
- [Platform dashboard](https://platform.zerogpu.ai)
- [Release guide](RELEASE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [License](LICENSE)
