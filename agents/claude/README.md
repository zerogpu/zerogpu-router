# ZeroGPU Router for Claude Code

Offload cheap, well-defined NLP tasks (classification, summarization, entity & PII extraction, short chat) from Claude to ZeroGPU's edge-optimized small language models, directly from your Claude Code session.

Every command in the `zerogpu` CLI is exposed as a Claude Code skill. Claude auto-invokes the right skill when your request matches (e.g. "redact the PII in this paragraph", "summarize this article", "classify this by sentiment and topic"), or you can call any of them by name with `/zerogpu-router:<skill>`.

---

## Installation

### Prerequisites

| Requirement | Why | Install |
| --- | --- | --- |
| **Node.js ≥ 20** | Runs the `zerogpu` CLI | [nodejs.org](https://nodejs.org) |
| **Claude Code** | Hosts the plugin | `npm install -g @anthropic-ai/claude-code` |
| **`zerogpu` CLI ≥ 3.4.0** | Skills shell out to it | `npm install -g zerogpu-cli@latest` |
| **ZeroGPU account** | API key | [zerogpu.ai](https://zerogpu.ai) |

Verify the CLI is on your `PATH` and current:

```sh
zerogpu --version
```

Most chat skills and `classify-domain` need **3.3.0 or newer**, the release that added `chat --model` and the `classify_domain` command. `chat-glm` and `chat-deepseek` need **3.4.0 or newer**, which added those two models to the CLI's `--model` allowlist — on an older CLI they fail with `Unknown model` before any request is made.

### 1. Authenticate the CLI

```sh
zerogpu login
```

You'll be prompted (masked) for your **API key** (`zgpu-api-…`). Credentials are persisted locally and `ZEROGPU_API_KEY` is added to your shell profile.

For CI / non-interactive setups:

```sh
zerogpu login \
  --api-key zgpu-api-XXXXXXXXXXXXXXXXXX
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
zerogpu-router: enabled
```

You're ready to go.

---

## Quick start

Once installed, try any of these directly in Claude Code:

### Auto-invoked (just ask)

Claude picks the right skill based on what you say:

```text
Redact PII from this support ticket before I paste it into our public bug tracker:

Hi team, this is Sarah Chen (sarah.chen@northwind-labs.com, +1 415-555-0182).
Our prod database started throwing connection timeouts around 2:14 AM PT last
night. The on-call engineer Marcus Rivera (slack: @mrivera) restarted the
pgbouncer pod but the issue came back within 20 minutes. Billing should go to
our CFO Priya Patel at priya.patel@northwind-labs.com, billing address 1455
Market St, Suite 600, San Francisco, CA 94103. Please call me back at the
number above.
```
→ Claude routes to `redact-pii`. Names, emails, phone numbers, social handles, and street addresses come back replaced by uppercase label placeholders like `[PERSON]`, `[EMAIL]`, `[PHONE_NUMBER]`, `[ADDRESS]`, safe to paste into a public tracker, and the raw PII never enters Claude's context window. Project-specific identifiers (internal hostnames, IPs, contract numbers, card last-fours) aren't in the model's label set. Strip those yourself or use `/zerogpu-router:extract-entities` with custom labels.

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
/zerogpu-router:signin [--api-key <key>]
```

**Arguments**

| Flag | Required | Description |
| --- | --- | --- |
| `--api-key <key>` | optional | API key. Must start with `zgpu-api-`. If omitted, you'll be prompted (masked). |

**Example**

```text
/zerogpu-router:signin
```

On success the API key is written to your config file, and `ZEROGPU_API_KEY` is added to your shell profile so other tools can pick it up.

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
Saved so far:     ≈ $2  (vs baseline claude-opus-4-8)
Tokens offloaded: ≈ 430,120 frontier-model tokens
Routed calls:     58
Since:            Apr 12, 2026
```

Every routed call (chat, classify, extract, redact, summarize, …) records the frontier-model tokens it offloaded and the estimated dollars saved, persisted in `~/.zerogpu/savings.json` alongside your credentials. **Token counts are actual** (the API's usage report). The **dollar figure is a rounded estimate** of the frontier-model spend avoided: what those exact tokens would have cost on the baseline model minus the real ZeroGPU cost. The baseline defaults to `claude-opus-4-8` and is overridable via the `ZEROGPU_SAVINGS_MODEL` environment variable (e.g. `claude-sonnet-4-6`).

You don't have to ask: after some responses a short `💰 ZeroGPU savings so far: …` note appears automatically on a balanced cadence (≈ once every 4–5 routed calls, never twice in a row) so the running total stays visible without nagging.

Pass `--json` for the raw data, or `--reset` to clear the history.

---

### `/zerogpu-router:chat`

The default ZeroGPU chat skill. Handles work the 1.2B edge models can't carry (long documents, multi-step instructions, harder general-knowledge questions) at a fraction of frontier-model cost.

- **Model:** `gpt-oss-120b` (117B MoE, 131,072-token context)
- **Wraps:** `zerogpu chat -m gpt-oss-120b`
- **When Claude auto-invokes:** you've signalled "use a ZeroGPU model" or "don't use Claude for this" and the task isn't one of the specialized skills below.

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
/zerogpu-router:chat "Summarize the trade-offs between optimistic and pessimistic locking, then recommend one for a high-contention inventory table."
```

**Output:** the assistant's answer as plain text. The model emits a reasoning trace as well; the skill leaves off the CLI's `-r` flag, so only the final answer is printed.

Reach for `chat-liquid` when speed and cost matter more than quality, `chat-thinking` for a visible reasoning trace, or `chat-qwen` for multilingual prompts. When the input exceeds this model's 131K context, use `chat-deepseek` for code and agentic work or `chat-glm` for the most capable option — both carry a 1M-token context.

---

### `/zerogpu-router:chat-liquid`

The fastest, cheapest chat reply on the platform. Single-turn answers that don't need Claude-level reasoning or conversation context.

- **Model:** `LFM2.5-1.2B-Instruct`
- **Wraps:** `zerogpu chat -m LFM2.5-1.2B-Instruct`
- **When Claude auto-invokes:** quick factual answers, one-liners, basic rephrasings where you've signalled "use a small model" or asked for the cheapest option.

**Synopsis**

```
/zerogpu-router:chat-liquid <text> [-i <instructions>]
```

**Arguments**

| Name | Required | Description |
| --- | --- | --- |
| `text` | yes | The user message / prompt (quoted). |
| `-i`, `--instructions <instructions>` | optional | System instructions to steer behavior. |

**Example**

```text
/zerogpu-router:chat-liquid "Explain WebSockets in two sentences." -i "You are a concise technical writer."
```

**Output:** raw assistant text (or pretty-printed JSON if the model returned one). At 1.2B parameters the replies are terse and occasionally mechanical. If that's too weak, `/zerogpu-router:chat` runs the same prompt on `gpt-oss-120b`.

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

### `/zerogpu-router:chat-qwen`

Heavier chat tuned for multilingual work: 100+ languages, useful when the prompt or the expected answer isn't English.

- **Model:** `qwen3-30b-a3b-fp8` (30.5B MoE, 32,768-token context)
- **Wraps:** `zerogpu chat -m qwen3-30b-a3b-fp8`
- **When Claude auto-invokes:** non-English prompts, translation-adjacent tasks, mid-weight questions the edge models handle poorly.

**Synopsis**

```
/zerogpu-router:chat-qwen <text> [-i <instructions>]
```

**Example**

```text
/zerogpu-router:chat-qwen "Explica la diferencia entre un índice B-tree y uno hash en dos frases."
```

**Output:** the assistant's answer as plain text. This model is served by the Chat Completions API rather than the Responses API; the CLI routes it automatically. Its reasoning trace is omitted, since the skill doesn't pass `-r`.

---

### `/zerogpu-router:chat-deepseek`

Coding and agentic chat with a 1M-token context: reading or writing code across a large codebase, porting and refactoring, planning multi-step automation.

- **Model:** `deepseek-v4-flash` (284B MoE, 13B active per token, 1,048,576-token context)
- **Wraps:** `zerogpu chat -m deepseek-v4-flash`
- **When Claude auto-invokes:** code-heavy prompts, repo-scale questions, multi-step tool-use planning — especially when the input is too large for `chat`'s 131K context.

**Synopsis**

```
/zerogpu-router:chat-deepseek <text> [-i <instructions>]
```

**Example**

```text
/zerogpu-router:chat-deepseek "Port this callback-based module to async/await and flag any behaviour changes."
```

**Output:** the assistant's answer as plain text. Chat Completions only; the CLI routes it automatically. Its reasoning trace is omitted, since the skill doesn't pass `-r`.

At \$0.07 / \$0.14 per 1M input/output tokens this is the cheaper of the two 1M-context models — about a sixteenth of `chat-glm`. Prefer it when the task is code or tool-use rather than sheer input size.

---

### `/zerogpu-router:chat-glm`

The largest and most capable model on the platform, with a 1M-token context for whole repositories, book-length documents, and long agent transcripts.

- **Model:** `glm-5.2` (753B MoE, 8 of 256 experts per token, 1,048,576-token context)
- **Wraps:** `zerogpu chat -m glm-5.2`
- **When Claude auto-invokes:** long-horizon reasoning, or input that genuinely does not fit anywhere else.

**Synopsis**

```
/zerogpu-router:chat-glm <text> [-i <instructions>]
```

**Example**

```text
/zerogpu-router:chat-glm "Here is our entire service directory. Which services would a payments outage take down, and in what order?"
```

**Output:** the assistant's answer as plain text. Chat Completions only; the CLI routes it automatically. Its reasoning trace is omitted, since the skill doesn't pass `-r`.

**Cost:** \$1.10 / \$3.50 per 1M input/output tokens — roughly 20x `chat` (`gpt-oss-120b`) and over 50x the 1.2B edge models. It is the one skill here where the usual savings framing does not apply, so reach for it only when the size or horizon of the task actually requires it.

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

Enriched IAB classification: audience categories **plus** topics, keywords, and inferred user intent.

- **Model:** `zlm-v2-iab-classify-edge-enriched`
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

### `/zerogpu-router:classify-domain`

Classify a **domain name** against the IAB taxonomy without fetching the page. Built for bidstream enrichment and allow/deny-list scoring, where all you have is a hostname.

- **Model:** `zlm-v1-iab-domain-classifier`
- **Wraps:** `zerogpu classify_domain`
- **When Claude auto-invokes:** "what is example.com about?", "categorize these domains", any IAB request where the input is a URL rather than article text.

**Synopsis**

```
/zerogpu-router:classify-domain <domain>
```

The model takes a bare hostname. Claude strips the scheme, path, and query before calling, so pasting `https://www.nytimes.com/section/world?x=1` works too.

**Example**

```text
/zerogpu-router:classify-domain "espn.com"
```

**Output (illustrative, truncated)**

```json
{
  "audience": [
    { "id": 512, "name": "Sports Radio", "tier1_name": "Interest", "score": 0.66 }
  ],
  "content": {
    "iab_1_0": [{ "code": "IAB17", "name": "Sports", "tier": 1, "score": 0.79 }],
    "iab_2_2": [{ "id": 483, "name": "Sports", "tier1_name": "Sports", "score": 0.79 }]
  }
}
```

Payloads are up to 10x smaller than sending page text. If you have the actual article, use `classify-iab` or `classify-iab-enriched` instead; they see more signal.

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

Schema-driven, multi-axis classification: one chosen label per category.

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
| `text` | yes | n/a | Source text. |
| `-l <label>` / `--labels <a,b,c>` | yes (one) | n/a | Entity labels to extract. |
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
| `text` | yes | n/a | Source text. |
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

### `/zerogpu-router:generate-followups`

Generate the questions a reader would naturally ask next about a passage: "people also ask" style prompts, conversation continuations, suggested next steps.

- **Model:** `zlm-v1-followup-questions-edge`
- **Wraps:** `zerogpu generate_followups`
- **When Claude auto-invokes:** "what should I ask next?", "suggest follow-up questions", building a related-questions widget.

**Synopsis**

```
/zerogpu-router:generate-followups <text>
```

**Example**

```text
/zerogpu-router:generate-followups "The Fed held rates steady at its March meeting, citing sticky core inflation."
```

**Output (illustrative)**

```json
[
  "What are the implications of this decision?",
  "Can you provide more context on the Fed's recent moves?",
  "How do other central banks handle similar inflation?"
]
```

---

## Skills reference

Quick lookup table: all 20 skills at a glance.

| Skill | Purpose | Example |
| --- | --- | --- |
| `/zerogpu-router:signin` | Sign in and persist API key (manual only) | `/zerogpu-router:signin` |
| `/zerogpu-router:status` | Show current sign-in status (manual only) | `/zerogpu-router:status` |
| `/zerogpu-router:cost-savings` | Show cumulative savings vs. Claude (manual only) | `/zerogpu-router:cost-savings` |
| `/zerogpu-router:chat <text>` | Default chat via `gpt-oss-120b` (131K context) | `/zerogpu-router:chat "Compare optimistic vs pessimistic locking."` |
| `/zerogpu-router:chat-liquid <text>` | Fastest, cheapest chat via `LFM2.5-1.2B-Instruct` | `/zerogpu-router:chat-liquid "Explain WebSockets in two sentences."` |
| `/zerogpu-router:chat-thinking <text>` | Chat with the Thinking variant (returns reasoning) | `/zerogpu-router:chat-thinking "If a train leaves at 3 PM going 60 mph, when does it cover 150 miles?"` |
| `/zerogpu-router:chat-qwen <text>` | Heavier multilingual chat via `qwen3-30b-a3b-fp8` | `/zerogpu-router:chat-qwen "Explica los índices B-tree en dos frases."` |
| `/zerogpu-router:chat-deepseek <text>` | Coding and agentic chat via `deepseek-v4-flash` (1M context) | `/zerogpu-router:chat-deepseek "Port this module to async/await."` |
| `/zerogpu-router:chat-glm <text>` | Most capable, 1M context via `glm-5.2` (~20x the cost) | `/zerogpu-router:chat-glm "Which services would a payments outage take down?"` |
| `/zerogpu-router:classify-iab <text>` | IAB taxonomy classification | `/zerogpu-router:classify-iab "The Lakers signed a new point guard."` |
| `/zerogpu-router:classify-iab-enriched <text>` | IAB + topics/keywords/intent | `/zerogpu-router:classify-iab-enriched "Compare the Tesla Model Y and Hyundai Ioniq 5."` |
| `/zerogpu-router:classify-domain <domain>` | IAB classification from a hostname, no page fetch | `/zerogpu-router:classify-domain "espn.com"` |
| `/zerogpu-router:classify-zero-shot <text> -l …` | Zero-shot against custom labels | `/zerogpu-router:classify-zero-shot "fast laptop" -l positive -l negative` |
| `/zerogpu-router:classify-structured <text> -s '…'` | Schema-based multi-axis classification | `/zerogpu-router:classify-structured "ticket text" -s '{"sentiment":["positive","negative"]}'` |
| `/zerogpu-router:extract-entities <text> -l …` | Custom-label NER | `/zerogpu-router:extract-entities "Tim Cook met Sundar Pichai in Cupertino." -l person -l location` |
| `/zerogpu-router:extract-pii <text>` | Extract PII entities (returns JSON) | `/zerogpu-router:extract-pii "Contact Jane at jane@example.com"` |
| `/zerogpu-router:redact-pii <text>` | Mask PII in-line with `[LABEL]` placeholders | `/zerogpu-router:redact-pii "Email John at john@acme.com"` |
| `/zerogpu-router:extract-json <text> -s '…'` | Schema-driven JSON extraction | `/zerogpu-router:extract-json "..." -s '{"contact":["name::str::Full name"]}'` |
| `/zerogpu-router:summarize <text>` | Summarize with `llama-3.1-8b-instruct-fast` | `/zerogpu-router:summarize "The board met Thursday to review Q3 results..."` |
| `/zerogpu-router:generate-followups <text>` | Suggested next questions for a passage | `/zerogpu-router:generate-followups "The Fed held rates steady..."` |

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

- [`CHANGELOG.md`](./CHANGELOG.md): version history
- [ZeroGPU platform](https://zerogpu.ai): account, billing, model catalog
- [Claude Code plugins](https://docs.claude.com/en/plugins): how plugins work in Claude Code

## License

MIT. See [`LICENSE`](../../LICENSE) at the repo root.
