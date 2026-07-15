<p align="center">
  <img src="https://zerogpu.ai/assets/zerogpu-icon-dark-DB2Jfxq2.png" alt="ZeroGPU" width="160"/>
</p>

<h1 align="center">ZeroGPU Router</h1>

<p align="center">
  <strong>Cut inference costs without dumbing down your agent.</strong><br/>
  Route summarize, classify, PII redaction, JSON extraction, follow-ups, and short chat to small/nano models via the <code>zerogpu</code> CLI — executed locally by your agent's Bash tools.
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

ZeroGPU Router is a smart task router for AI agents. It exposes task-specific skills — summarize, classify, redact PII, extract JSON, and more — that shell out to the local `zerogpu` CLI, backed by small language models that run for a fraction of the cost of a frontier model.

Your agent keeps doing the heavy reasoning. The boring stuff gets routed to ZeroGPU.

- **OpenClaw** — install the `zerogpu` CLI plus **`zerogpu-router`** (see [agents/openclaw/](agents/openclaw/)). Skills run locally through your agent's Bash tools.
- **Claude Code** — install the `zerogpu` CLI plus the marketplace plugin and you get 11 auto-invoked skills plus a cost-savings readout (see [agents/claude/](agents/claude/)).
- **Cheap by default** — small models for trivial work, frontier model untouched for everything else.
- **Per-call savings** — every routed task returns model, latency, and a real `savings_usd` figure.
- **CLI, no infra** — the `zerogpu` CLI talks to the hosted models for you. Nothing to run or host yourself.

## OpenClaw quick start

You need a ZeroGPU API key and project ID. Grab them at [platform.zerogpu.ai](https://platform.zerogpu.ai).

**1. Install the OpenClaw plugin** ([`zerogpu-router`](https://clawhub.ai/zerogpu/plugins/zerogpu-router)):

```sh
openclaw plugins install clawhub:zerogpu-router
```

The plugin's skills provision the `zerogpu` CLI automatically on first use (via a `node` install spec), so there's no separate global install — you just need a package manager (npm by default) available.

**2. Authenticate:**

```sh
zerogpu login
```

You'll be prompted for your API key (`zgpu-api-…`) and project ID (UUID).

Pin a release: `clawhub:zerogpu-router@2.0.0`.

**4. Try it:**

```text
summarize this account note: Renewal call with Acme Corp went well overall. They
are happy with uptime but frustrated by slow support response times over the last
two months. Their VP hinted at evaluating a competitor if the SLA does not improve
before the December renewal. They also asked about volume pricing for a second
team of about 40 seats. Action items: loop in support leadership and send an
updated enterprise quote by Friday.
```

The agent runs the `summarize` skill — which executes `zerogpu summarize` locally via its Bash tool — and returns a concise, slightly mechanical summary plus a savings line, for example:

```text
Positive Acme Corp renewal call — happy with uptime, frustrated by slow support
the last two months. VP may evaluate a competitor if the SLA does not improve
before the December renewal; also asked about volume pricing for ~40 more seats.
Next: loop in support leadership, send an updated enterprise quote by Friday.

💰 ZeroGPU savings so far: $1.87 (16,320 Claude tokens offloaded)
```

## Claude Code quick start

The Claude Code plugin ships 14 skills — 11 inference skills that Claude auto-invokes when your request matches ("summarize this", "redact the PII", "classify by sentiment and topic"), plus the manual `signin`, `status`, and `cost-savings` skills. You can also call any skill manually with `/zerogpu-router:<name>`. Run `/zerogpu-router:cost-savings` anytime to see how much you've saved by routing trivial work to ZeroGPU.

Grab a ZeroGPU API key and project ID at [platform.zerogpu.ai](https://platform.zerogpu.ai), then:

**1. Install the `zerogpu` CLI** (the plugin shells out to it):

```sh
npm install -g zerogpu-cli
```

**2. Authenticate:**

```sh
zerogpu login
```

You'll be prompted for your API key (`zgpu-api-…`) and project ID (UUID).

**3. Install the Claude Code plugin** — start a Claude Code session by running `claude` in your terminal, then:

```text
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
/reload-plugins
```

**4. Try it:**

```text
Redact PII from this support ticket before I paste it into our public bug tracker:

Hi team — this is Sarah Chen (sarah.chen@northwind-labs.com, +1 415-555-0182).
Our prod database started throwing connection timeouts around 2:14 AM PT last
night. The on-call engineer Marcus Rivera (slack: @mrivera) restarted the
pgbouncer pod but the issue came back within 20 minutes. Billing should go to
our CFO Priya Patel at priya.patel@northwind-labs.com, billing address 1455
Market St, Suite 600, San Francisco, CA 94103. Please call me back at the
number above.
```

Claude routes to `/zerogpu-router:redact-pii` automatically and returns the same passage with names, emails, phone numbers, social handles, and street addresses replaced by uppercase label placeholders like `[PERSON]`, `[EMAIL]`, `[PHONE_NUMBER]`, `[ADDRESS]` — safe to paste into a public tracker. The `gliner-multi-pii-v1` edge model does the masking, not Claude, so the raw PII never enters Claude's context window.

The model is tuned for the standard PII categories above. Project-specific identifiers (internal hostnames, IPs, contract numbers, card last-fours) won't be caught — strip those yourself, or pipe the result through `/zerogpu-router:extract-entities` with your own custom labels.

Full walkthrough — prerequisites, every skill documented in detail, troubleshooting: **[agents/claude/README.md](agents/claude/README.md)**.


## Cloud connection

Sign in at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** to:

- Generate API keys and project IDs
- Watch live token usage, latency, and routed-call savings on the dashboard
- See per-tool savings broken down by agent and time range
- Manage agents, billing, and team access
- Follow setup for your stack: [OpenClaw](agents/openclaw/README.md) and [Claude Code](agents/claude/README.md) — both use the `zerogpu` CLI plus a plugin

The `zerogpu` CLI runs on your machine and talks to the hosted ZeroGPU models. The dashboard at `platform.zerogpu.ai` is where you see what it did.

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
| [agents/openclaw/](agents/openclaw/) | **OpenClaw:** `zerogpu-cli` + package/plugin id **`zerogpu-router`** + CLI-based skills |
| [agents/claude/](agents/claude/) | **Claude Code:** `zerogpu-cli` + marketplace plugin (`/plugin install zerogpu-router@zerogpu`) |

## Quick Links

- [OpenClaw setup](agents/openclaw/README.md)
- [Agent integrations index](agents/README.md)
- [Claude Code setup](agents/claude/README.md)
- [Platform dashboard](https://platform.zerogpu.ai)
- [OpenClaw release guide](docs/OPENCLAW_PLUGIN_RELEASE_GUIDE.md)
- [Claude Code release guide](docs/CLAUDE_PLUGIN_RELEASE_GUIDE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [License](LICENSE)
