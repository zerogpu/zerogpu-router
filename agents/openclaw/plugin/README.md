# ZeroGPU Router

> Cut your OpenClaw agent's inference costs. Route trivial AI tasks — summarize, classify, redact PII, extract JSON, generate follow-ups, short chat — to small/nano models instead of burning frontier-model tokens.

[![Website](https://img.shields.io/badge/website-zerogpu.ai-22c55e)](https://zerogpu.ai)
[![Dashboard](https://img.shields.io/badge/dashboard-platform.zerogpu.ai-blue)](https://platform.zerogpu.ai)
[![License](https://img.shields.io/badge/license-MIT-yellow)](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE)

## What it does

Your OpenClaw agent keeps doing the heavy reasoning. Routine tasks get offloaded to ZeroGPU's small models — typically 100–1000× cheaper per call.

- 11 task-specific skills (`zerogpu_summarize`, `zerogpu_classify_iab`, `zerogpu_redact_pii`, …)
- Each skill shells out to the local `zerogpu` CLI via the agent's Bash tools — nothing to host or register
- A routing skill that teaches your agent **when** to use each one
- Per-call savings logged with model, latency, and a real `savings_usd` figure

## Quickstart

Get an API key + project ID at [platform.zerogpu.ai](https://platform.zerogpu.ai), then:

```bash
# 1. Install the ZeroGPU CLI (skills shell out to it)
npm install -g zerogpu-cli

# 2. Log in (prompts for API key + project ID)
zerogpu login

# 3. Install this plugin
openclaw plugins install zerogpu-openclaw-plugin
```

Pin a release: `zerogpu-openclaw-plugin@1.4.0`.

## Try it

Ask your agent in plain language — it picks the right skill, runs the `zerogpu` CLI locally instead of the host model, and replies with the result plus a savings line.

**Summarize**

```text
summarize this paragraph: Renewable energy adoption is accelerating globally, driven by falling solar and wind costs.
```

**Classify**

```text
classify this ticket as bug, feature, or question: "The export button does nothing on Safari."
```

**Redact PII**

```text
redact the PII in this before I share it: "Email Sarah Chen at sarah.chen@northwind-labs.com or call +1 415-555-0182."
```

## The 11 skills you get

| Skill | Workload | Backing model |
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

Every skill returns `{ <task fields>, model, usage, savings }`.

## Watch your savings

Live dashboard at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** — token usage, latency, per-tool savings, broken down by agent and time range.

## Advanced — install from source

Use this only if you want to test unreleased changes or contribute to the repo.

This package lives at `agents/openclaw/plugin/` in the [zerogpu-router](https://github.com/zerogpu/zerogpu-router) monorepo. Install from a checkout instead of npm — use the plugin path, not `git:github.com/zerogpu/zerogpu-router@ref` on the repo root:

```bash
tmpdir=$(mktemp -d)
git clone --depth 1 -b main https://github.com/zerogpu/zerogpu-router.git "$tmpdir/repo"
(cd "$tmpdir/repo/agents/openclaw/plugin" && npm ci && npm run build)
openclaw plugins install "$tmpdir/repo/agents/openclaw/plugin"
```

## Links

- Website: <https://zerogpu.ai>
- Dashboard: <https://platform.zerogpu.ai>
- Source: <https://github.com/zerogpu/zerogpu-router>
- Full setup guide: <https://github.com/zerogpu/zerogpu-router/tree/main/agents/openclaw>
- Issues / contact: <hello@zerogpu.ai>

## License

MIT — see [LICENSE](https://github.com/zerogpu/zerogpu-router/blob/main/LICENSE).
