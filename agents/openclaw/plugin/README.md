# ZeroGPU Router

Cut your OpenClaw agent's inference costs. Route trivial AI tasks — summarize, classify, redact PII, extract JSON, generate follow-ups, short chat — to small/nano models instead of burning frontier-model tokens.

[![Website](https://img.shields.io/badge/website-zerogpu.ai-22c55e)](https://zerogpu.ai)
[![Dashboard](https://img.shields.io/badge/dashboard-platform.zerogpu.ai-blue)](https://platform.zerogpu.ai)
[![License](https://img.shields.io/badge/license-MIT-yellow)](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE)

## What it does

Your OpenClaw agent keeps doing the heavy reasoning. Routine tasks get offloaded to ZeroGPU's small models — typically 100–1000× cheaper per call.

- Task-specific skills (`summarize`, `classify-iab`, `redact-pii`, …)
- Each skill shells out to the local `zerogpu` CLI via the agent's Bash tools — nothing to host or register
- Per-call savings logged with model, latency, and a real `savings_usd` figure

## Quickstart

Get an API key + project ID at [platform.zerogpu.ai](https://platform.zerogpu.ai), then:

```bash
# 1. Install the plugin — OpenClaw provisions the `zerogpu` CLI automatically on first use
openclaw plugins install clawhub:zerogpu-router

# 2. Log in (prompts for API key + project ID)
zerogpu login
```

Pin a release: `clawhub:zerogpu-router@2.0.0`.

> The skills declare the `zerogpu` CLI as a dependency (`requires.bins`) with a `node` install
> spec, so OpenClaw installs `zerogpu-cli` for you on first use — no manual global install. You
> just need a package manager (npm by default) available, then a one-time `zerogpu login`. In
> sandboxed/Docker agents, make sure `zerogpu` is available inside the container.

## Try it

Ask your agent in plain language — it picks the right skill, runs the `zerogpu` CLI locally instead of the host model, and replies with the result plus a savings line. The replies below are illustrative: the models are small, so output is concise and a little mechanical.

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
💰 ZeroGPU savings so far: $2.14 (18,730 Claude tokens offloaded)
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
💰 ZeroGPU savings so far: $2.21 (19,180 Claude tokens offloaded)
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
💰 ZeroGPU savings so far: $2.28 (19,650 Claude tokens offloaded)
```

Note the card last-four is left untouched — the PII model covers standard categories (names, emails, phones, addresses), not project-specific identifiers. Strip those yourself.

## The skills you get

| Skill | Workload | Backing model |
|---|---|---|
| `classify-iab` | IAB topic classification | `zlm-v1-iab-classify-edge` |
| `classify-iab-enriched` | IAB categories plus topics, keywords, intent | `zlm-v1-iab-classify-edge-enriched` |
| `summarize` | TL;DRs, abstracts, meeting summaries | `llama-3.1-8b-instruct-fast` |
| `classify-zero-shot` | Classify against a flat label list | `deberta-v3-small` |
| `classify-structured` | Multi-axis schema classification | `gliner2-base-v1` |
| `extract-entities` | People, places, companies, dates, custom entities | `gliner2-base-v1` |
| `extract-json` | Pull structured fields into grouped JSON | `gliner2-base-v1` |
| `redact-pii` | Mask emails, phones, names, addresses, other PII | `gliner-multi-pii-v1` |
| `extract-pii` | Extract PII grouped by category | `gliner-multi-pii-v1` |
| `chat` | Short small-model chat replies | `LFM2.5-1.2B-Instruct` |
| `chat-thinking` | Short chat replies with a visible reasoning trace | `LFM2.5-1.2B-Thinking` |
| `cost-savings` | Cumulative dollars and tokens offloaded to ZeroGPU | — |
| `signin` | Sign in and persist API key + Project ID | — |
| `status` | Show current sign-in status | — |

Every skill returns `{ <task fields>, model, usage, savings }`.

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
