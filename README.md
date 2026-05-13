<p align="center">
  <img src="https://zerogpu.ai/assets/zerogpu-icon-dark-DB2Jfxq2.png" alt="ZeroGPU" width="160"/>
</p>

<h1 align="center">ZeroGPU Router</h1>

<p align="center">
  <strong>Cut inference costs without dumbing down your agent.</strong><br/>
  Route summarize, classify, PII redaction, JSON extraction, follow-ups, and short chat to small/nano models via MCP — hosted at <code>https://mcp.zerogpu.ai/mcp</code>.
</p>

<p align="center">
  <a href="https://platform.zerogpu.ai">
    <img src="https://img.shields.io/badge/Platform-Dashboard-22c55e?style=for-the-badge" alt="Open ZeroGPU platform" />
  </a>
  &nbsp;
  <a href="https://www.zerogpu.ai">
    <img src="https://img.shields.io/badge/Main-Website-22c55e?style=for-the-badge" alt="Open ZeroGPU platform" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/zerogpu/zerogpu-router/stargazers"><img src="https://img.shields.io/github/stars/zerogpu/zerogpu-router?style=flat-square" alt="GitHub stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/status-beta-blue?style=flat-square" alt="Beta" />
  <a href="agents/openclaw/"><img src="https://img.shields.io/badge/OpenClaw-plugin-black?style=flat-square" alt="OpenClaw" /></a>
  <a href="agents/claude/"><img src="https://img.shields.io/badge/Claude_Code-setup-blue?style=flat-square" alt="Claude Code" /></a>
  <a href="https://zerogpu.ai"><img src="https://img.shields.io/badge/website-zerogpu.ai-111827?style=flat-square" alt="Website" /></a>
</p>

![ZeroGPU dashboard](assets/zerogpu-dashboard.gif)

## What is ZeroGPU Router?

ZeroGPU Router is a smart task router for AI agents. It exposes task-specific tools — summarize, classify, redact PII, extract JSON, and more — via the Model Context Protocol (MCP), backed by small language models that run for a fraction of the cost of a frontier model.

Your agent keeps doing the heavy reasoning. The boring stuff gets routed to ZeroGPU.

- **OpenClaw** — install **`zerogpu-openclaw-plugin`** and register MCP in OpenClaw (see [agents/openclaw/](agents/openclaw/)); package name and plugin `id` match.
- **Claude Code** — different CLI and plugin flow; use [agents/claude/](agents/claude/) for `claude mcp add` and marketplace plugin install.
- **Cheap by default** — small models for trivial work, frontier model untouched for everything else.
- **Per-call savings** — every routed task returns model, latency, and a real `savings_usd` figure.
- **Hosted, no infra** — point your agent at `https://mcp.zerogpu.ai/mcp`. We run the routing layer.

## OpenClaw quick start

You need a ZeroGPU API key and project ID. Grab them at [platform.zerogpu.ai](https://platform.zerogpu.ai).

Install the OpenClaw plugin tarball from npm (published as [`zerogpu-openclaw-plugin`](https://www.npmjs.com/package/zerogpu-openclaw-plugin)):

```sh
tmpdir=$(mktemp -d) && cd "$tmpdir" && npm pack zerogpu-openclaw-plugin@0.1.10 && tar -xzf zerogpu-openclaw-plugin-*.tgz && cd package && openclaw plugins install ./
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

## Claude Code quick start

Claude Code uses its own MCP and plugin commands — not the OpenClaw steps above. Full walkthrough: [agents/claude/README.md](agents/claude/README.md).

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


## Cloud connection

Sign in at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** to:

- Generate API keys and project IDs
- Watch live token usage, latency, and routed-call savings on the dashboard
- See per-tool savings broken down by agent and time range
- Manage agents, billing, and team access
- Follow setup for your stack: [OpenClaw](agents/openclaw/README.md) vs [Claude Code](agents/claude/README.md) use different commands

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
| [agents/openclaw/](agents/openclaw/) | **OpenClaw:** package + plugin id **`zerogpu-openclaw-plugin`** + skill + MCP registration JSON |
| [agents/claude/](agents/claude/) | **Claude Code:** MCP setup + marketplace plugin (`claude mcp` + `/plugin`) |

## Quick Links

- [OpenClaw setup](agents/openclaw/README.md)
- [Agent integrations index](agents/README.md)
- [Claude Code setup](agents/claude/README.md)
- [Platform dashboard](https://platform.zerogpu.ai)
- [Release guide](RELEASE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [License](LICENSE)
