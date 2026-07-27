# ZeroGPU Router

**Cut your OpenClaw agent's inference costs.** Route your AI tasks — summarize, classify, redact PII, extract JSON, short chat — to open-weight and small language models instead of burning frontier-model tokens. Our APIs are OpenAI-compatible and pay-as-you-go.

[![Website](https://img.shields.io/badge/website-zerogpu.ai-22c55e)](https://zerogpu.ai)
[![Dashboard](https://img.shields.io/badge/dashboard-platform.zerogpu.ai-3b82f6)](https://platform.zerogpu.ai)
[![Docs](https://img.shields.io/badge/docs-docs.zerogpu.ai-8b5cf6)](https://docs.zerogpu.ai)
[![OpenAI compatible](https://img.shields.io/badge/API-OpenAI--compatible-000000)](https://docs.zerogpu.ai/api-reference/chat-completions)
[![Pricing](https://img.shields.io/badge/pricing-pay--as--you--go-f59e0b)](https://docs.zerogpu.ai/docs/model-catalog)
[![License](https://img.shields.io/badge/license-MIT-eab308)](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE)

`#cost-optimization` `#model-routing` `#open-weight-models` `#small-language-models` `#classification` `#pii-redaction` `#summarization` `#openai-compatible`

---

## What it does

Your OpenClaw agent keeps doing the heavy reasoning. Routine tasks get offloaded to ZeroGPU's open-weight and small models — typically **100–1000× cheaper per call**.

Our open-weight models are the most cost-effective on the market right now. You'll find models here you won't see anywhere else, and we add roughly one a day.

- **18 task-specific skills** — `summarize`, `classify-iab`, `redact-pii`, `extract-json`, and more
- **Nothing to host or register** — each skill shells out to the local `zerogpu` CLI through the agent's Bash tools
- **Savings you can see** — every call logs its model, usage, and a real dollar figure
- **OpenAI-compatible, pay-as-you-go** — no commitments, no idle GPU cost

## Quickstart

Get an API key at [platform.zerogpu.ai](https://platform.zerogpu.ai), then:

```bash
# 1. Install the CLI the skills shell out to
npm install -g zerogpu-cli@latest

# 2. Log in (prompts for your API key)
zerogpu login

# 3. Install the plugin
openclaw plugins install clawhub:zerogpu-router
```

> Every skill shells out to the `zerogpu` CLI, so install it globally and run a one-time
> `zerogpu login` before using the plugin. In sandboxed/Docker agents, make sure `zerogpu`
> is available inside the container.

## Try it

Ask your agent in plain language — it picks the right skill, shells out to the local `zerogpu` CLI (which **sends your text to ZeroGPU's hosted API** for inference, instead of using the host model), and replies with the result plus a savings line. The replies below are illustrative: the models are small, so output is concise and a little mechanical.

> **Your input leaves your machine.** These skills transmit the text you give them to ZeroGPU's third-party service — see [Data & privacy](#data--privacy) below before feeding them anything sensitive. Because the agent can pick these skills from plain-language requests, decide up front what you're comfortable routing off-box.

**Summarize** — condense a meeting recap:

```text
summarize this: Team, quick recap of today's sync. We agreed to push the mobile
checkout redesign to the March release because the payments integration slipped a
sprint. QA flagged two blocker bugs on Android that engineering will prioritize
this week. Marketing still wants the new pricing page live before the end of the
quarter, so we will revisit scope on Thursday. Please update your tickets before
standup tomorrow.
```

Reply:

```text
mobile checkout redesign pushed to march release, payments integration slipped a
sprint. qa flagged two android blocker bugs, engineering to fix this week.
marketing wants pricing page live by end of quarter, scope revisited thursday.
update tickets before standup.

model: llama-3.1-8b-instruct-fast · 78 tokens in / 41 out
💰 ZeroGPU savings so far: ≈ $2 (18,730 frontier-model tokens offloaded)
```

**Classify** — triage a support ticket against your own labels:

```text
classify this support ticket as billing, bug, feature-request, or account —
"I was charged twice for my October subscription, and the second charge is a
different amount than my plan. Please refund the duplicate and explain the
difference."
```

Reply:

```text
[
  { "label": "billing",         "score": 0.94 },
  { "label": "account",         "score": 0.29 },
  { "label": "bug",             "score": 0.07 },
  { "label": "feature-request", "score": 0.02 }
]

model: deberta-v3-small · 61 tokens in
💰 ZeroGPU savings so far: ≈ $2 (19,180 frontier-model tokens offloaded)
```

**Redact PII** — scrub a CRM note before sharing it:

```text
redact the PII in this CRM note before I share it with the vendor —
"Call with Daniel Okafor (daniel.okafor@brightwave.io, +1 206-555-0147) on Tue.
Send the enterprise quote to their AP team at 400 Pine St, Seattle, WA 98101.
Card on file ends 4412 — do not reference it in email."
```

Reply:

```text
Call with [PERSON] ([EMAIL], [PHONE_NUMBER]) on Tue. Send the enterprise quote to
their AP team at [ADDRESS]. Card on file ends 4412 — do not reference it in email.

model: gliner-multi-pii-v1 · 5 spans masked
💰 ZeroGPU savings so far: ≈ $2 (19,650 frontier-model tokens offloaded)
```

Note the card last-four is left untouched — the PII model covers standard categories (names, emails, phones, addresses), not project-specific identifiers. Strip those yourself.

## The skills you get

**Classification**

| Skill | Workload | Backing model |
|---|---|---|
| `classify-iab` | IAB topic classification | `zlm-v1-iab-classify-edge` |
| `classify-iab-enriched` | IAB categories plus topics, keywords, intent | `zlm-v2-iab-classify-edge-enriched` |
| `classify-domain` | IAB classification from a bare hostname, no page fetch | `zlm-v1-iab-domain-classifier` |
| `classify-zero-shot` | Classify against a flat label list | `deberta-v3-small` |
| `classify-structured` | Multi-axis schema classification | `gliner2-base-v1` |

**Extraction & PII**

| Skill | Workload | Backing model |
|---|---|---|
| `redact-pii` | Mask emails, phones, names, addresses, other PII | `gliner-multi-pii-v1` |
| `extract-pii` | Extract PII grouped by category | `gliner-multi-pii-v1` |
| `extract-entities` | People, places, companies, dates, custom entities | `gliner2-base-v1` |
| `extract-json` | Pull structured fields into grouped JSON | `gliner2-base-v1` |

**Generation**

| Skill | Workload | Backing model |
|---|---|---|
| `summarize` | TL;DRs, abstracts, meeting summaries | `llama-3.1-8b-instruct-fast` |
| `generate-followups` | Suggested next questions for a passage | `zlm-v1-followup-questions-edge` |
| `chat` | Short small-model chat replies | `LFM2.5-1.2B-Instruct` |
| `chat-thinking` | Short chat replies with a visible reasoning trace | `LFM2.5-1.2B-Thinking` |
| `chat-gpt-oss` | Heavier chat: long context, multi-step instructions | `gpt-oss-120b` |
| `chat-qwen` | Heavier chat: multilingual, 100+ languages | `qwen3-30b-a3b-fp8` |

**Account**

| Skill | Workload |
|---|---|
| `cost-savings` | Cumulative dollars and tokens offloaded to ZeroGPU |
| `signin` | Sign in and persist API key |
| `status` | Show current sign-in status |

Every skill returns `{ <task fields>, model, usage, savings }`. Browse the full catalog with pricing at [docs.zerogpu.ai](https://docs.zerogpu.ai/docs/model-catalog).

## Watch your savings

Live dashboard at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** — token usage, latency, per-tool savings, broken down by agent and time range.

## Data & privacy

**These skills are not local processing.** Every content skill (`summarize`, `classify-*`, `extract-*`, `redact-pii`, `extract-pii`, `generate-followups`, `chat`, `chat-thinking`, `chat-gpt-oss`, `chat-qwen`) passes the text you supply to the local `zerogpu` CLI, which transmits it over the network to ZeroGPU's hosted models. The CLI runs locally; the inference does not.

Before using these skills:

- **Do not** send secrets, credentials, API keys, or regulated data (PHI, cardholder data, etc.) unless you have cleared third-party processing with ZeroGPU for that data.
- The PII skills (`redact-pii`, `extract-pii`) **send the raw, un-redacted text** to the service in order to detect PII — redaction happens after transmission, not before. They reduce what you forward *downstream*, not what reaches ZeroGPU.
- Treat inputs the way you'd treat any third-party API call: assume the request may be logged or retained per ZeroGPU's terms and retention policy. Review those at [zerogpu.ai](https://zerogpu.ai) for your compliance needs.

**Credentials:** `zerogpu login` (the `signin` skill) writes your API key to a local config file and upserts `ZEROGPU_API_KEY` into your shell profile — a persistent change to your environment. Revoke keys from the [dashboard](https://platform.zerogpu.ai).

## Support

| | |
|---|---|
| Website | <https://zerogpu.ai> |
| Docs | <https://docs.zerogpu.ai> |
| Dashboard | <https://platform.zerogpu.ai> |
| Source | <https://github.com/zerogpu/zerogpu-router> |
| Setup guide | <https://github.com/zerogpu/zerogpu-router/tree/main/agents/openclaw> |
| Issues | <https://github.com/zerogpu/zerogpu-router/issues> |
| Contact | <hello@zerogpu.ai> |

## License

MIT — see [LICENSE](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE).
