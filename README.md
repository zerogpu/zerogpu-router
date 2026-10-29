<p align="center">
  <img src="https://zerogpu.ai/assets/zerogpu-logo-dark-sWHVe27f.webp" alt="ZeroGPU" width="160"/>
</p>

<h1 align="center">ZeroGPU Router</h1>

<p align="center">
  <strong>Cut inference costs without dumbing down your agent.</strong><br/>
  Route summarize, classify, JSON extraction, and short chat to small/nano models via the <code>zerogpu</code> CLI, executed locally by your agent's Bash tools.
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

## What is ZeroGPU Router?

ZeroGPU Router is a smart task router for AI agents. It exposes task-specific skills (summarize, classify, extract JSON, and more) that shell out to the local `zerogpu` CLI, backed by small language models that run for a fraction of the cost of a frontier model.

Your agent keeps doing the heavy reasoning. The boring stuff gets routed to ZeroGPU.

- **OpenClaw:** install the `zerogpu` CLI plus **`zerogpu-router`** (see [agents/openclaw/](agents/openclaw/)). Skills run locally through your agent's Bash tools.
- **Claude Code:** install the `zerogpu` CLI plus the marketplace plugin and you get 29 auto-invoked skills plus a cost-savings readout (see [agents/claude/](agents/claude/)).
- **Cheap by default:** small models for trivial work, frontier model untouched for everything else.
- **Per-call savings:** every routed task returns model, latency, and a real `savings_usd` figure.
- **CLI, no infra:** everything runs through the local `zerogpu` CLI your agent already calls. No servers, MCP endpoints, or infra to stand up.

## OpenClaw quick start

You need a ZeroGPU API key. Grab it at [platform.zerogpu.ai](https://platform.zerogpu.ai).

**1. Install the OpenClaw plugin** ([`zerogpu-router`](https://clawhub.ai/zerogpu/plugins/zerogpu-router)):

```sh
openclaw plugins install clawhub:zerogpu-router
```

The plugin's skills provision the `zerogpu` CLI automatically on first use (via a `node` install spec), so there's no separate global install. You just need a package manager (npm by default) available.

**2. Authenticate:**

```sh
zerogpu login
```

You'll be prompted for your API key (`zgpu-api-…`).

**4. Try it:**

```text
summarize this account note: Renewal call with Acme Corp went well overall. They
are happy with uptime but frustrated by slow support response times over the last
two months. Their VP hinted at evaluating a competitor if the SLA does not improve
before the December renewal. They also asked about volume pricing for a second
team of about 40 seats. Action items: loop in support leadership and send an
updated enterprise quote by Friday.
```

The agent runs the `summarize` skill, which executes `zerogpu summarize` locally via its Bash tool, and returns a concise, slightly mechanical summary plus a savings line, for example:

```text
Positive Acme Corp renewal call: happy with uptime, frustrated by slow support
the last two months. VP may evaluate a competitor if the SLA does not improve
before the December renewal; also asked about volume pricing for ~40 more seats.
Next: loop in support leadership, send an updated enterprise quote by Friday.

💰 ZeroGPU savings so far: $1.87 (16,320 Claude tokens offloaded)
```

## Claude Code quick start

The Claude Code plugin ships 32 skills: 29 inference skills that Claude auto-invokes when your request matches ("summarize this", "extract the people and companies from this", "classify by sentiment and topic"), plus the manual `signin`, `status`, and `cost-savings` skills. You can also call any skill manually with `/zerogpu-router:<name>`. Run `/zerogpu-router:cost-savings` anytime to see how much you've saved by routing trivial work to ZeroGPU.

Grab a ZeroGPU API key at [platform.zerogpu.ai](https://platform.zerogpu.ai), then:

**1. Install the `zerogpu` CLI** (the plugin shells out to it):

```sh
npm install -g zerogpu-cli
```

**2. Authenticate:**

```sh
zerogpu login
```

You'll be prompted for your API key (`zgpu-api-…`).

**3. Install the Claude Code plugin.** Start a Claude Code session by running `claude` in your terminal, then:

```text
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
/reload-plugins
```

**4. Try it:**

```text
Pull every person, company, and email address out of this support ticket:

Hi team, this is Sarah Chen (sarah.chen@northwind-labs.com, +1 415-555-0182).
Our prod database started throwing connection timeouts around 2:14 AM PT last
night. The on-call engineer Marcus Rivera (slack: @mrivera) restarted the
pgbouncer pod but the issue came back within 20 minutes. Billing should go to
our CFO Priya Patel at priya.patel@northwind-labs.com, billing address 1455
Market St, Suite 600, San Francisco, CA 94103. Please call me back at the
number above.
```

Claude routes to `/zerogpu-router:extract-entities` automatically and the `gliner2.5-base-v1` edge model returns the spans it found for each label you named — people, companies, email addresses — rather than Claude reading them out itself.

The labels are yours to choose, so project-specific identifiers (internal hostnames, IPs, contract numbers, card last-fours) work as well as the standard entity types: name them in the request. For a passage that is not in English, Claude routes to `/zerogpu-router:extract-entities-multi` instead.

Full walkthrough (prerequisites, every skill documented in detail, troubleshooting): **[agents/claude/README.md](agents/claude/README.md)**.

## Routes

ZeroGPU Router exposes thirty-two auto-invoked skills: twenty-nine task routes and three account utilities.

**Chat and generation**

| Skill | Workload | Model |
|---|---|---|
| `chat` | Default chat: long context, multi-step instructions | `gpt-oss-120b` |
| `chat-liquid` | Fastest, cheapest chat replies | `LFM2.5-1.2B-Instruct` |
| `chat-thinking` | Short chat replies with a visible reasoning trace | `LFM2.5-1.2B-Thinking` |
| `chat-qwen` | Multilingual chat, 100+ languages | `qwen3-30b-a3b-fp8` |
| `chat-qwen3-6-35b-a3b` | Multimodal chat over text, images, and video | `qwen3.6-35b-a3b` |
| `chat-deepseek-v4-1-flash` | 1M-token context with higher-effort reasoning and function calling | `deepseek-v4.1-flash` |
| `chat-glm-5-3-flash` | Coding and long-horizon agents, cheapest 1M-token context | `glm-5.3-flash` |
| `chat-gpt-4-1-mini` | 1M-token context, instruction following and tool calling | `gpt-4.1-mini` |
| `chat-gpt-5-6-luna` | Cost-optimized high-volume chat, 272K-token context | `gpt-5.6-luna` |
| `chat-gpt-5-4-nano` | High-volume, latency-sensitive routing and extraction, 400K-token context | `gpt-5.4-nano` |
| `chat-gpt-6-luna` | Most efficient GPT-6, 272K-token context | `gpt-6-luna` |
| `decide-tools` | Pick the right tool for a request and generate its arguments | `zlm-v1-tool-decisions` |
| `summarize` | TL;DRs, abstracts, meeting note summaries | `llama-3.1-8b-instruct-fast` |
| `summarize-llama-3-2-3b` | Cheaper summaries at 3B parameters | `llama-3.2-3b-instruct-fast` |

On OpenClaw this skill is named **`zerogpu-summarize`** — OpenClaw bundles its own `summarize` skill (for URLs, videos, and PDFs), and two skills cannot share a name. The `transcribe` and `speak` skills carry the same `zerogpu-` prefix there, for the same reason. Skill names are otherwise identical across both agents.

**Classification**

| Skill | Workload | Model |
|---|---|---|
| `classify-iab` | IAB topic classification | `zlm-v1-iab-classify-edge` |
| `classify-iab-enriched` | IAB categories plus topics, keywords, intent | `zlm-v2-iab-classify-edge-enriched` |
| `classify-domain` | IAB classification from a bare hostname, no page fetch | `zlm-v1-iab-domain-classifier` |
| `classify-zero-shot` | Classify against a flat label list | `deberta-v3-small` |
| `classify-structured` | Multi-axis schema classification | `gliner2.5-base-v1` |
| `classify-decisions` | Dynamic-label decisions, intent and routing | `gliner2.5-decide-v1` |

**Extraction and PII**

| Skill | Workload | Model |
|---|---|---|
| `extract-entities` | Extract people, places, companies, dates, custom entities | `gliner2.5-base-v1` |
| `extract-entities-multi` | The same, for text that is not in English | `gliner2.5-multi-v1` |
| `extract-json` | Pull structured fields into grouped JSON | `gliner2.5-base-v1` |
| `extract-signals` | Topics, keywords, intent and other contextual signals | `zlm-v1-signal-extract` |

**Moderation and embeddings**

| Skill | Workload | Model |
|---|---|---|
| `moderate` | Safety verdict across OpenAI's 13 moderation categories | `zlm-v1-moderation-edge` |
| `moderate-llama` | Safe/unsafe verdict with the policy categories named | `llama-guard-4-12b` |
| `embed` | Text to 384-dimensional vectors for search, RAG, dedupe | `all-minilm-l6-v2`, `bge-small-en-v1.5` |

**Speech**

| Skill | Workload | Model |
|---|---|---|
| `transcribe` | Speech to text for voice agents, meetings, subtitles | `whisper-tiny` |
| `speak` | Text to speech with expressive delivery and voice cloning | `chatterbox-nano` |

**Account** (manual only): `signin`, `status`, `cost-savings`.

Every task skill prints the model's answer as plain text, and occasionally appends a `💰 ZeroGPU savings` line.

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
