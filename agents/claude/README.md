# ZeroGPU Router — Claude Code plugin

Offload cheap, well-defined NLP tasks (classification, summarization, entity & PII extraction, short chat) from Claude to ZeroGPU's edge-optimized small language models — directly from your Claude Code session.

Every command in the `zerogpu` CLI is exposed as a Claude Code skill. Claude auto-invokes the right skill when your request matches (e.g. "redact the PII in this paragraph", "summarize this article", "classify this by sentiment and topic"), or you can call any of them by name with `/zerogpu-router:<skill>`.

---

## Installation

### Prerequisites

| Requirement | Why | Install |
| --- | --- | --- |
| **Node.js ≥ 20** | Runs the `zerogpu` CLI | [nodejs.org](https://nodejs.org) |
| **Claude Code** | Hosts the plugin | `npm install -g @anthropic-ai/claude-code` |
| **`zerogpu` CLI** | Skills shell out to it | `npm install -g zerogpu-cli` |
| **ZeroGPU account** | API key + Project ID | [zerogpu.ai](https://zerogpu.ai) |

Verify the CLI is on your `PATH`:

```sh
zerogpu --version
```

### 1. Authenticate the CLI

```sh
zerogpu login
```

You'll be prompted (masked) for your **API key** (`zgpu-api-…`) and **Project ID** (UUID). Credentials are persisted locally and `ZEROGPU_API_KEY` is added to your shell profile.

For CI / non-interactive setups:

```sh
zerogpu login \
  --api-key zgpu-api-XXXXXXXXXXXXXXXXXX \
  --project-id 4ed3e5bb-c2ed-4d4a-8a66-2b161a27fd1a
```

Check status anytime:

```sh
zerogpu status
```

### 2. Install the Claude Code plugin

Start a Claude Code session by running `claude` in your terminal, then add this repo as a marketplace and install:

```text
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
/reload-plugins
```

Confirm it's loaded:

```text
/plugin
```

Expected output includes:

```text
zerogpu-router — enabled
```

You're ready to go.

---

## Quick start

Once installed, try any of these directly in Claude Code:

### Auto-invoked (just ask)

Claude picks the right skill based on what you say:

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
→ Claude routes to `redact-pii`. Names, emails, phone numbers, social handles, and street addresses come back replaced by uppercase label placeholders like `[PERSON]`, `[EMAIL]`, `[PHONE_NUMBER]`, `[ADDRESS]` — safe to paste into a public tracker, and the raw PII never enters Claude's context window. Project-specific identifiers (internal hostnames, IPs, contract numbers, card last-fours) aren't in the model's label set — strip those yourself or use `/zerogpu-router:extract-entities` with custom labels.

```text
Pull all the email addresses and phone numbers out of this:
"Reach Maria at maria@acme.io or 415-555-0188"
```
→ Claude routes to `extract-pii`.

```text
Classify this support ticket by sentiment and topic:
"Support replied quickly but the fix didn't work"
```
→ Claude routes to `classify-structured` with an appropriate schema.

### Manual invocation

Call any skill explicitly with `/zerogpu-router:<name> <args>`:

```text
/zerogpu-router:classify-zero-shot "I love how fast this laptop boots up." -l positive -l negative -l neutral
```

```text
/zerogpu-router:redact-pii "Email John Smith at john@acme.com about invoice 12345."
```

```text
/zerogpu-router:extract-json "Reach Maria Lopez at maria.lopez@acme.io or 415-555-0188." \
  -s '{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}'
```

---

## Skills in detail

Each skill below documents what it does, which ZeroGPU model it runs, how to invoke it, what arguments it accepts, and what the output looks like. All inference skills auto-invoke when Claude detects a matching request; `signin`, `status`, and `cost-savings` are manual-only.

### `/zerogpu-router:signin`

Sign in to ZeroGPU and persist your credentials so every subsequent skill call works without re-prompting.

- **Manual only** (not auto-invoked by Claude)
- **Wraps:** `zerogpu login`

**Synopsis**

```
/zerogpu-router:signin [--api-key <key>] [--project-id <id>]
```

**Arguments**

| Flag | Required | Description |
| --- | --- | --- |
| `--api-key <key>` | optional | API key. Must start with `zgpu-api-`. If omitted, you'll be prompted (masked). |
| `--project-id <id>` | optional | Project ID (UUID v4). If omitted, you'll be prompted. |

**Example**

```text
/zerogpu-router:signin
```

On success the API key + Project ID are written to your config file, and `ZEROGPU_API_KEY` is added to your shell profile so other tools can pick it up.

---

### `/zerogpu-router:status`

Show your current ZeroGPU sign-in status and the masked API key.

- **Manual only**
- **Wraps:** `zerogpu status`

**Example**

```text
/zerogpu-router:status
```

Exit code is `0` when signed in, `1` when not. If you're not signed in, run `/zerogpu-router:signin`.

---

### `/zerogpu-router:cost-savings`

Show how much you've saved by routing trivial tasks to ZeroGPU instead of Claude.

- **Manual only**
- **Wraps:** `zerogpu cost_savings`

**Example**

```text
/zerogpu-router:cost-savings
```

**Output (illustrative)**

```text
💰 ZeroGPU Cost Savings
───────────────────────
Saved so far:     ~$2.14
Tokens offloaded: ≈ 430,120 Claude tokens
Routed calls:     58
Avg per call:     ~$0.04
Since:            Apr 12, 2026

By model:
  llama-3.1-8b-instruct-fast  —  20 calls, ~$1.20, 210K tok
  gliner2-base-v1             —  18 calls, ~$0.61, 120K tok
  ...
```

Every routed call (chat, classify, extract, redact, summarize, …) records the Claude tokens it offloaded and the dollars saved, persisted in `~/.zerogpu/savings.json` alongside your credentials. **Token counts and ZeroGPU costs are actual** (real per-model ZeroGPU rates × the API's usage report). The **dollar savings** is the Claude spend avoided: what those exact tokens would have cost on Claude minus the real ZeroGPU cost. The Claude baseline defaults to `claude-opus-4-8` and is overridable via the `ZEROGPU_SAVINGS_MODEL` environment variable (e.g. `claude-sonnet-4-6`).

You don't have to ask: after some responses a short `💰 ZeroGPU savings so far: …` note appears automatically on a balanced cadence (≈ once every 4–5 routed calls, never twice in a row) so the running total stays visible without nagging.

Pass `--json` for the raw data, or `--reset` to clear the history.

---

### `/zerogpu-router:chat`

Short, single-turn chat reply for things that don't need Claude-level reasoning or conversation context.

- **Model:** `LFM2.5-1.2B-Instruct`
- **Wraps:** `zerogpu chat`
- **When Claude auto-invokes:** quick factual answers, one-liners, basic rephrasings where you've signalled "use a small model."

**Synopsis**

```
/zerogpu-router:chat <text> [-i <instructions>]
```

**Arguments**

| Name | Required | Description |
| --- | --- | --- |
| `text` | yes | The user message / prompt (quoted). |
| `-i`, `--instructions <instructions>` | optional | System instructions to steer behavior. |

**Example**

```text
/zerogpu-router:chat "Explain WebSockets in two sentences." -i "You are a concise technical writer."
```

**Output:** raw assistant text (or pretty-printed JSON if the model returned one).

---

### `/zerogpu-router:chat-thinking`

Same as `chat`, but the model returns its reasoning trace alongside the answer.

- **Model:** `LFM2.5-1.2B-Thinking`
- **Wraps:** `zerogpu chat_thinking`
- **When Claude auto-invokes:** short logic / math / word-problem questions where step-by-step reasoning is useful.

**Synopsis**

```
/zerogpu-router:chat-thinking <text>
```

**Example**

```text
/zerogpu-router:chat-thinking "If a train leaves at 3 PM going 60 mph, when does it cover 150 miles?"
```

---

### `/zerogpu-router:classify-iab`

Classify text against the **IAB content / audience taxonomy** (standard ad-tech category labels).

- **Model:** `zlm-v1-iab-classify-edge`
- **Wraps:** `zerogpu classify_iab`
- **When Claude auto-invokes:** "what IAB category is this?", "tag this article for ad targeting", "give me the topic taxonomy."

**Synopsis**

```
/zerogpu-router:classify-iab <text>
```

**Example**

```text
/zerogpu-router:classify-iab "The Lakers signed a new point guard ahead of the playoffs."
```

**Output (illustrative)**

```json
{
  "categories": [
    { "id": "IAB17-44", "name": "Basketball", "confidence": 0.97 }
  ]
}
```

---

### `/zerogpu-router:classify-iab-enriched`

Enriched IAB classification — audience categories **plus** topics, keywords, and inferred user intent.

- **Model:** `zlm-v1-iab-classify-edge-enriched`
- **Wraps:** `zerogpu classify_iab_enriched`
- **When Claude auto-invokes:** "give me topics, keywords, and intent", richer ad/audience signals than plain IAB labels.

**Synopsis**

```
/zerogpu-router:classify-iab-enriched <text>
```

**Example**

```text
/zerogpu-router:classify-iab-enriched "Compare the Tesla Model Y and the Hyundai Ioniq 5 for a family of four."
```

**Output (illustrative)**

```json
{
  "categories": [{ "id": "IAB2-1", "name": "Auto Buyers", "confidence": 0.92 }],
  "topics": ["electric vehicles", "family cars"],
  "keywords": ["Tesla Model Y", "Hyundai Ioniq 5"],
  "intent": "comparison-shopping"
}
```

---

### `/zerogpu-router:classify-zero-shot`

Zero-shot classification against an arbitrary list of candidate labels you supply.

- **Model:** `deberta-v3-small`
- **Wraps:** `zerogpu classify_zero_shot`
- **When Claude auto-invokes:** "is this positive, negative, or neutral?", "tag this as bug, feature, or question."

**Synopsis**

```
/zerogpu-router:classify-zero-shot <text> (-l <label>...) | (--labels a,b,c)
```

**Arguments**

| Name | Required | Description |
| --- | --- | --- |
| `text` | yes | Text to classify (quoted). |
| `-l <label>` | one of `-l` / `--labels` | A single label. Repeatable. |
| `--labels <a,b,c>` | one of `-l` / `--labels` | Comma-separated label list. |

**Example**

```text
/zerogpu-router:classify-zero-shot "I love how fast this laptop boots up." -l positive -l negative -l neutral
```

**Output (illustrative)**

```json
{ "label": "positive", "scores": { "positive": 0.94, "neutral": 0.04, "negative": 0.02 } }
```

---

### `/zerogpu-router:classify-structured`

Schema-driven, multi-axis classification — one chosen label per category.

- **Model:** `gliner2-base-v1`
- **Wraps:** `zerogpu classify_structured`
- **When Claude auto-invokes:** "classify by sentiment and topic", any request that names multiple classification dimensions with explicit label sets.

**Synopsis**

```
/zerogpu-router:classify-structured <text> -s '<json schema>'
```

**Arguments**

| Name | Required | Description |
| --- | --- | --- |
| `text` | yes | Text to classify. |
| `-s`, `--schema <json>` | **yes** | JSON object mapping each category to its allowed labels. |

**Example**

```text
/zerogpu-router:classify-structured "Support replied quickly but the fix didn't work." \
  -s '{"sentiment":["positive","negative","neutral"],"topic":["support","billing","product"]}'
```

**Output (illustrative)**

```json
{ "sentiment": "negative", "topic": "support" }
```

---

### `/zerogpu-router:extract-entities`

Custom-label named-entity recognition. You define the entity labels; the model finds spans.

- **Model:** `gliner2-base-v1`
- **Wraps:** `zerogpu extract_entities`
- **When Claude auto-invokes:** "extract all people, organizations, and locations from this", "find every product mention."

**Synopsis**

```
/zerogpu-router:extract-entities <text> (-l <label>... | --labels a,b,c) [-t <0..1>]
```

**Arguments**

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `text` | yes | — | Source text. |
| `-l <label>` / `--labels <a,b,c>` | yes (one) | — | Entity labels to extract. |
| `-t`, `--threshold <number>` | optional | `0.3` | Minimum confidence in `[0, 1]`. |

**Example**

```text
/zerogpu-router:extract-entities "Apple CEO Tim Cook met with Sundar Pichai in Cupertino on Monday." \
  --labels person,organization,location -t 0.4
```

**Output (illustrative)**

```json
[
  { "label": "organization", "text": "Apple", "score": 0.98 },
  { "label": "person", "text": "Tim Cook", "score": 0.97 },
  { "label": "person", "text": "Sundar Pichai", "score": 0.96 },
  { "label": "location", "text": "Cupertino", "score": 0.91 }
]
```

---

### `/zerogpu-router:extract-pii`

Extract personally identifiable information entities, grouped by category, **without modifying the source text**.

- **Model:** `gliner-multi-pii-v1`
- **Wraps:** `zerogpu extract_pii`
- **When Claude auto-invokes:** "find all PII", "what personal info is in this?", "list emails/phones/names."

**Synopsis**

```
/zerogpu-router:extract-pii <text> [-t <threshold>] [(-c | --categories) <list>]
```

**Arguments**

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `text` | yes | — | Source text. |
| `-t`, `--threshold <number>` | optional | `0.5` | Minimum confidence. |
| `-c`, `--categories <list>` | optional | `identity,contact` | Comma-separated. Other values: `financial`, `medical`, `credentials`. |

**Example**

```text
/zerogpu-router:extract-pii "Contact Jane Doe at jane@example.com or +1 (415) 555-1212." -t 0.6 -c identity,contact,financial
```

**Output (illustrative)**

```json
[
  { "category": "identity", "label": "person", "text": "Jane Doe", "score": 0.96 },
  { "category": "contact",  "label": "email",  "text": "jane@example.com", "score": 0.99 },
  { "category": "contact",  "label": "phone",  "text": "+1 (415) 555-1212", "score": 0.95 }
]
```

If you want to **mask** PII inline rather than extract it, use `/zerogpu-router:redact-pii` instead.

---

### `/zerogpu-router:redact-pii`

Detect PII and replace each span in-line with a `[LABEL]` placeholder. Use this before sharing or logging sensitive text.

- **Model:** `gliner-multi-pii-v1` (with `mask: "label"`)
- **Wraps:** `zerogpu redact_pii`
- **When Claude auto-invokes:** "redact", "scrub", "mask", "anonymize", or "sanitize this for sharing."

**Synopsis**

```
/zerogpu-router:redact-pii <text>
```

**Example**

```text
/zerogpu-router:redact-pii "Email John Smith at john@acme.com about invoice 12345."
```

**Output**

```
Email [PERSON] at [EMAIL] about invoice 12345.
```

---

### `/zerogpu-router:extract-json`

Pull specific named fields out of free text into a structured JSON object, defined by a per-field schema.

- **Model:** `gliner2-base-v1`
- **Wraps:** `zerogpu extract_json`
- **When Claude auto-invokes:** "extract the contact info as JSON", "parse this invoice", "pull these fields out."

**Synopsis**

```
/zerogpu-router:extract-json <text> -s '<json schema>'
```

**Schema syntax:** each field is `name::type::description`.

**Example**

```text
/zerogpu-router:extract-json "Reach Maria Lopez at maria.lopez@acme.io or 415-555-0188." \
  -s '{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}'
```

**Output (illustrative)**

```json
{
  "contact": {
    "name": "Maria Lopez",
    "email": "maria.lopez@acme.io",
    "phone": "415-555-0188"
  }
}
```

---

### `/zerogpu-router:summarize`

Condense a passage into a short summary.

- **Model:** `llama-3.1-8b-instruct-fast`
- **Wraps:** `zerogpu summarize`
- **When Claude auto-invokes:** "summarize", "TL;DR", "give me the gist", "condense this."

**Synopsis**

```
/zerogpu-router:summarize <text>
```

**Example**

```text
/zerogpu-router:summarize "The board met Thursday to review Q3 results. Revenue rose 18% \
year-over-year to $42M, driven mainly by enterprise renewals and a strong launch in the EU \
market. Operating margin slipped to 11% from 14% as headcount grew 30% ahead of the new \
data-center buildout. The CFO flagged rising cloud costs as the top risk for Q4 and proposed \
a hiring freeze on non-engineering roles until margins recover. The board approved the freeze \
and asked for a revised 2025 budget by mid-December."
```

**Output (illustrative)**

```text
Q3 revenue grew 18% YoY to $42M on enterprise renewals and EU growth, but operating margin
fell to 11% due to a 30% headcount increase for the data-center buildout. Citing cloud costs
as the main Q4 risk, the board approved a hiring freeze on non-engineering roles and requested
a revised 2025 budget by mid-December.
```

---

## Skills reference

Quick lookup table — all 14 skills at a glance.

| Skill | Purpose | Example |
| --- | --- | --- |
| `/zerogpu-router:signin` | Sign in and persist API key + Project ID (manual only) | `/zerogpu-router:signin` |
| `/zerogpu-router:status` | Show current sign-in status (manual only) | `/zerogpu-router:status` |
| `/zerogpu-router:cost-savings` | Show cumulative savings vs. Claude (manual only) | `/zerogpu-router:cost-savings` |
| `/zerogpu-router:chat <text>` | Short chat reply via `LFM2.5-1.2B-Instruct` | `/zerogpu-router:chat "Explain WebSockets in two sentences."` |
| `/zerogpu-router:chat-thinking <text>` | Chat with the Thinking variant (returns reasoning) | `/zerogpu-router:chat-thinking "If a train leaves at 3 PM going 60 mph, when does it cover 150 miles?"` |
| `/zerogpu-router:classify-iab <text>` | IAB taxonomy classification | `/zerogpu-router:classify-iab "The Lakers signed a new point guard."` |
| `/zerogpu-router:classify-iab-enriched <text>` | IAB + topics/keywords/intent | `/zerogpu-router:classify-iab-enriched "Compare the Tesla Model Y and Hyundai Ioniq 5."` |
| `/zerogpu-router:classify-zero-shot <text> -l …` | Zero-shot against custom labels | `/zerogpu-router:classify-zero-shot "fast laptop" -l positive -l negative` |
| `/zerogpu-router:classify-structured <text> -s '…'` | Schema-based multi-axis classification | `/zerogpu-router:classify-structured "ticket text" -s '{"sentiment":["positive","negative"]}'` |
| `/zerogpu-router:extract-entities <text> -l …` | Custom-label NER | `/zerogpu-router:extract-entities "Tim Cook met Sundar Pichai in Cupertino." -l person -l location` |
| `/zerogpu-router:extract-pii <text>` | Extract PII entities (returns JSON) | `/zerogpu-router:extract-pii "Contact Jane at jane@example.com"` |
| `/zerogpu-router:redact-pii <text>` | Mask PII in-line with `[LABEL]` placeholders | `/zerogpu-router:redact-pii "Email John at john@acme.com"` |
| `/zerogpu-router:extract-json <text> -s '…'` | Schema-driven JSON extraction | `/zerogpu-router:extract-json "..." -s '{"contact":["name::str::Full name"]}'` |
| `/zerogpu-router:summarize <text>` | Summarize with `llama-3.1-8b-instruct-fast` | `/zerogpu-router:summarize "The board met Thursday to review Q3 results..."` |

For full flag reference (thresholds, categories, schema syntax), run `zerogpu <command> --help`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `zerogpu: command not found` | CLI not installed or not on `PATH` | `npm install -g zerogpu-cli`, then restart your shell |
| Skill returns "You're not signed in yet." | No credentials | Run `/zerogpu-router:signin` |
| `/zerogpu-router:*` skills don't appear in `/help` | Plugin not enabled | Run `/plugin` and enable `zerogpu-router` |
| `Request failed with status 401` | Bad / revoked API key | Re-run `/zerogpu-router:signin` |
| `Request failed with status 429` | Rate limited | Back off and retry |

---

## Additional documentation

- [`CHANGELOG.md`](./CHANGELOG.md) — version history
- [ZeroGPU platform](https://zerogpu.ai) — account, billing, model catalog
- [Claude Code plugins](https://docs.claude.com/en/plugins) — how plugins work in Claude Code

## License

MIT — see [`LICENSE`](../../LICENSE) at the repo root.
