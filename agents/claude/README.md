# ZeroGPU Router for Claude Code

Offload cheap, well-defined NLP tasks (classification, summarization, entity & PII extraction, short chat) from Claude to ZeroGPU's edge-optimized small language models, directly from your Claude Code session.

Every ZeroGPU task is exposed as a Claude Code skill. Each skill names its own model and calls the `zerogpu` CLI's model-agnostic endpoint commands (`chat_completions`, `moderations`, `embeddings`), so the plugin keeps working when the CLI's model list changes. Claude auto-invokes the right skill when your request matches (e.g. "redact the PII in this paragraph", "summarize this article", "classify this by sentiment and topic"), or you can call any of them by name with `/zerogpu-router:<skill>`.

---

## Installation

### Prerequisites

| Requirement | Why | Install |
| --- | --- | --- |
| **Node.js ≥ 20** | Runs the `zerogpu` CLI | [nodejs.org](https://nodejs.org) |
| **Claude Code** | Hosts the plugin | `npm install -g @anthropic-ai/claude-code` |
| **`zerogpu` CLI ≥ 3.8.0** | Skills shell out to it | `npm install -g zerogpu-cli@latest` |
| **ZeroGPU account** | API key | [zerogpu.ai](https://zerogpu.ai) |

Verify the CLI is on your `PATH` and current:

```sh
zerogpu --version
```

The inference skills need **3.8.0 or newer**, the release that added the `chat_completions`, `moderations`, and `embeddings` commands. Those commands take the model from the skill and keep no model list of their own, so later CLI releases that add, rename, or remove models do not affect the plugin. On an older CLI the skills fail with `error: unknown command 'chat_completions'`.

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
/zerogpu-router:redact-pii Email John Smith at john@acme.com about invoice 12345.
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

- **Model:** `gpt-oss-120b` (120B MoE, 131,072-token context)
- **Wraps:** `zerogpu chat_completions -m gpt-oss-120b`
- **When Claude auto-invokes:** you've signalled "use a ZeroGPU model" or "don't use Claude for this" and the task isn't one of the specialized skills below.

**Synopsis**

```
/zerogpu-router:chat <text>
```

**Example**

```text
/zerogpu-router:chat Summarize the trade-offs between optimistic and pessimistic locking, then recommend one for a high-contention inventory table.
```

**Output:** the assistant's answer as plain text. The model emits a reasoning trace as well; Chat Completions returns it in a separate field, so only the final answer is printed.

Reach for `chat-liquid` when speed and cost matter more than quality, `chat-thinking` for a visible reasoning trace, or `chat-qwen` for multilingual prompts. When the input exceeds this model's 131K context, use `chat-deepseek` for code and agentic work or `chat-glm` for the most capable option — `deepseek-v4-flash-0731` carries a 1M-token context, `glm-5.2` a 262K one.

---

### `/zerogpu-router:chat-liquid`

The fastest, cheapest chat reply on the platform. Single-turn answers that don't need Claude-level reasoning or conversation context.

- **Model:** `LFM2.5-1.2B-Instruct`
- **Wraps:** `zerogpu chat_completions -m LFM2.5-1.2B-Instruct`
- **When Claude auto-invokes:** quick factual answers, one-liners, basic rephrasings where you've signalled "use a small model" or asked for the cheapest option.

**Synopsis**

```
/zerogpu-router:chat-liquid <text>
```

**Example**

```text
/zerogpu-router:chat-liquid Explain WebSockets in two sentences.
```

**Output:** raw assistant text (or pretty-printed JSON if the model returned one). At 1.2B parameters the replies are terse and occasionally mechanical. If that's too weak, `/zerogpu-router:chat` runs the same prompt on `gpt-oss-120b`.

---

### `/zerogpu-router:chat-thinking`

Same as `chat`, but the model returns its reasoning trace alongside the answer.

- **Model:** `LFM2.5-1.2B-Thinking`
- **Wraps:** `zerogpu chat_completions -m LFM2.5-1.2B-Thinking --raw`
- **When Claude auto-invokes:** short logic / math / word-problem questions where step-by-step reasoning is useful.

**Synopsis**

```
/zerogpu-router:chat-thinking <text>
```

**Example**

```text
/zerogpu-router:chat-thinking If a train leaves at 3 PM going 60 mph, when does it cover 150 miles?
```

**Output:** the model's reasoning, then its answer. The skill prints the full Chat Completions response, where the reasoning is a separate field, and Claude shows the two in order.

---

### `/zerogpu-router:chat-qwen`

Heavier chat tuned for multilingual work: 100+ languages, useful when the prompt or the expected answer isn't English.

- **Model:** `qwen3-30b-a3b-fp8` (30B MoE, 32,768-token context)
- **Wraps:** `zerogpu chat_completions -m qwen3-30b-a3b-fp8`
- **When Claude auto-invokes:** non-English prompts, translation-adjacent tasks, mid-weight questions the edge models handle poorly.

**Synopsis**

```
/zerogpu-router:chat-qwen <text>
```

**Example**

```text
/zerogpu-router:chat-qwen Explica la diferencia entre un índice B-tree y uno hash en dos frases.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

---

### `/zerogpu-router:chat-deepseek`

Coding and agentic chat with a 1M-token context: reading or writing code across a large codebase, porting and refactoring, planning multi-step automation.

- **Model:** `deepseek-v4-flash-0731` (284B MoE, 13B active per token, 1,048,576-token context)
- **Wraps:** `zerogpu chat_completions -m deepseek-v4-flash-0731`
- **When Claude auto-invokes:** code-heavy prompts, repo-scale questions, multi-step tool-use planning — especially when the input is too large for `chat`'s 131K context.

**Synopsis**

```
/zerogpu-router:chat-deepseek <text>
```

**Example**

```text
/zerogpu-router:chat-deepseek Port this callback-based module to async/await and flag any behaviour changes.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

At \$0.16 / \$0.38 per 1M input/output tokens this is the cheaper of the two 1M-context models on the platform — about a seventh of `chat-glm` on input and a ninth on output. Prefer it when the task is code or tool-use rather than sheer input size.

---

### `/zerogpu-router:chat-deepseek-v4-1-flash`

The V4.1 Flash line: the same 1M-token context as `chat-deepseek`, on DeepSeek's Causal Encoder-Decoder architecture, with function calling and a higher-effort reasoning mode alongside fast non-thinking replies.

- **Model:** `deepseek-v4.1-flash` (sparse MoE, 8B active on input and 16B on output, 1,048,576-token context)
- **Wraps:** `zerogpu chat_completions -m deepseek-v4.1-flash`
- **When Claude auto-invokes:** large codebases, long documents, extended conversations, and multi-step agent tasks where the extra reasoning effort or function calling is worth the higher price.

**Synopsis**

```
/zerogpu-router:chat-deepseek-v4-1-flash <text>
```

**Example**

```text
/zerogpu-router:chat-deepseek-v4-1-flash Here is the whole service package. Plan the migration to the new billing API, step by step, and flag every call site that changes.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

At \$0.30 / \$1.20 per 1M input/output tokens this is the pricier of the two 1M-context models — roughly twice `chat-deepseek` on input and three times on output, and about a quarter of `chat-glm` on input and a third on output. For ordinary coding and agentic work at the same context size, `chat-deepseek` is cheaper.

---

### `/zerogpu-router:chat-glm`

The most capable model on the platform, with a 262K-token context for whole repositories, book-length documents, and long agent transcripts.

- **Model:** `glm-5.2` (753B MoE, 8 of 256 experts per token, 262,144-token context)
- **Wraps:** `zerogpu chat_completions -m glm-5.2`
- **When Claude auto-invokes:** long-horizon reasoning, or input too large for `chat` that isn't code or agentic work.

**Synopsis**

```
/zerogpu-router:chat-glm <text>
```

**Example**

```text
/zerogpu-router:chat-glm Here is our entire service directory. Which services would a payments outage take down, and in what order?
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

**Cost:** \$1.10 / \$3.50 per 1M input/output tokens — roughly 7x `chat` (`gpt-oss-120b`, \$0.15 / \$0.60) on input and 6x on output, and over 50x the 1.2B edge models. It is the one skill here where the usual savings framing does not apply, so reach for it only when the size or horizon of the task actually requires it.

---

### `/zerogpu-router:classify-iab`

Classify text against the **IAB content / audience taxonomy** (standard ad-tech category labels).

- **Model:** `zlm-v1-iab-classify-edge`
- **Wraps:** `zerogpu chat_completions -m zlm-v1-iab-classify-edge`
- **When Claude auto-invokes:** "what IAB category is this?", "tag this article for ad targeting", "give me the topic taxonomy."

**Synopsis**

```
/zerogpu-router:classify-iab <text>
```

**Example**

```text
/zerogpu-router:classify-iab The Lakers signed a new point guard.
```

**Output (truncated)**

```json
{
  "audience": [{ "name": "Basketball", "score": 0.879 }, { "name": "Sports", "score": 0.830 }],
  "content": {
    "iab_1_0": [{ "name": "Pro Basketball", "score": 0.952 }],
    "iab_2_2": [{ "name": "Basketball", "score": 0.952 }]
  }
}
```

---

### `/zerogpu-router:classify-iab-enriched`

Enriched IAB classification: audience categories **plus** topics, keywords, and inferred user intent.

- **Model:** `zlm-v2-iab-classify-edge-enriched`
- **Wraps:** `zerogpu chat_completions -m zlm-v2-iab-classify-edge-enriched`
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
- **Wraps:** `zerogpu chat_completions -m zlm-v1-iab-domain-classifier`
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
- **Wraps:** `zerogpu chat_completions -m deberta-v3-small`, with the labels as a `[a, b, c]` system message
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

Claude reads the arguments and runs the command itself, putting the labels in the system message, where the model reads them. Plain words work too: `… labels: bug, feature, question`.

**Example**

```text
/zerogpu-router:classify-zero-shot "I love how fast this laptop boots up." -l positive -l negative -l neutral
```

**Output (illustrative)**

```json
{ "positive": 0.9795, "neutral": 0.0120, "negative": 0.0085 }
```

---

### `/zerogpu-router:classify-structured`

Schema-driven, multi-axis classification: one chosen label per category.

- **Model:** `gliner2-base-v1`
- **Wraps:** `zerogpu chat_completions -m gliner2-base-v1` with `usecase: "classification"`
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

Claude reads the arguments and runs the command itself, sending the schema as `metadata` with `usecase: "classification"`.

**Example**

```text
/zerogpu-router:classify-structured "Support replied quickly but the fix didn't work." \
  -s '{"sentiment":["positive","negative","neutral"],"topic":["support","billing","product"]}'
```

**Output**

```json
{ "classification": { "sentiment": "negative", "topic": "support" } }
```

---

### `/zerogpu-router:extract-entities`

Custom-label named-entity recognition. You define the entity labels; the model finds spans.

- **Model:** `gliner2-base-v1`
- **Wraps:** `zerogpu chat_completions -m gliner2-base-v1` with `usecase: "ner"`
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

Claude reads the arguments and runs the command itself, sending the labels and threshold as `metadata` with `usecase: "ner"`.

**Example**

```text
/zerogpu-router:extract-entities "Apple CEO Tim Cook met with Sundar Pichai in Cupertino on Monday." \
  --labels person,organization,location -t 0.4
```

**Output (illustrative)**

```json
{
  "entities": {
    "person": ["Tim Cook", "Sundar Pichai"],
    "organization": ["Apple"],
    "location": ["Cupertino"]
  }
}
```

---

### `/zerogpu-router:extract-pii`

Extract personally identifiable information entities **without modifying the source text**.

- **Model:** `gliner-multi-pii-v1`
- **Wraps:** `zerogpu chat_completions -m gliner-multi-pii-v1` with `usecase: "extract-pii"`, threshold `0.5`
- **When Claude auto-invokes:** "find all PII", "what personal info is in this?", "list emails/phones/names."

**Synopsis**

```
/zerogpu-router:extract-pii <text>
```

**Example**

```text
/zerogpu-router:extract-pii Contact Jane Doe at jane@example.com, SSN 123-45-6789.
```

**Output (illustrative)**

```json
{
  "entities": [
    { "text": "Jane Doe", "label": "person", "start": 8, "end": 16, "score": 0.9995 },
    { "text": "jane@example.com", "label": "email", "start": 20, "end": 36, "score": 0.9814 },
    { "text": "123-45-6789", "label": "social security number", "start": 42, "end": 53, "score": 0.9928 }
  ]
}
```

If you want to **mask** PII inline rather than extract it, use `/zerogpu-router:redact-pii` instead.

---

### `/zerogpu-router:redact-pii`

Detect PII and replace each span in-line with a `[LABEL]` placeholder. Use this before sharing or logging sensitive text.

- **Model:** `gliner-multi-pii-v1` (with `mask: "label"`)
- **Wraps:** `zerogpu chat_completions -m gliner-multi-pii-v1` with `usecase: "redact"`
- **When Claude auto-invokes:** "redact", "scrub", "mask", "anonymize", or "sanitize this for sharing."

**Synopsis**

```
/zerogpu-router:redact-pii <text>
```

**Example**

```text
/zerogpu-router:redact-pii Email John Smith at john@acme.com about invoice 12345.
```

**Output (truncated)**

```json
{
  "redacted_text": "Email [PERSON] at [EMAIL] about invoice 12345.",
  "entities": [
    { "text": "John Smith", "label": "person", "start": 6, "end": 16, "score": 0.9981 },
    { "text": "john@acme.com", "label": "email", "start": 20, "end": 33, "score": 0.9311 }
  ]
}
```

---

### `/zerogpu-router:extract-json`

Pull specific named fields out of free text into a structured JSON object, defined by a per-field schema.

- **Model:** `gliner2-base-v1`
- **Wraps:** `zerogpu chat_completions -m gliner2-base-v1` with `usecase: "json"`
- **When Claude auto-invokes:** "extract the contact info as JSON", "parse this invoice", "pull these fields out."

**Synopsis**

```
/zerogpu-router:extract-json <text> -s '<json schema>'
```

**Schema syntax:** each field is `name::type::description`. Claude reads the arguments and runs the command itself, sending the schema as `metadata` with `usecase: "json"`.

**Example**

```text
/zerogpu-router:extract-json "Reach Maria Lopez at maria.lopez@acme.io or 415-555-0188." \
  -s '{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}'
```

**Output**

```json
{
  "data": {
    "contact": [
      { "name": "Maria Lopez", "email": "maria.lopez@acme.io", "phone": "415-555-0188" }
    ]
  }
}
```

---

### `/zerogpu-router:extract-signals`

Turn a passage into structured signals — topics, keywords, intent, and other contextual attributes — in one inference call, for enrichment and routing pipelines rather than for a human reader.

- **Model:** `zlm-v1-signal-extract` (80M, 400-token context)
- **Wraps:** `zerogpu chat_completions -m zlm-v1-signal-extract`
- **When Claude auto-invokes:** "what signals are in this text?", content enrichment, contextual targeting, agent routing, recommendation and analytics pipelines.

**Synopsis**

```
/zerogpu-router:extract-signals <text>
```

**Example**

```text
/zerogpu-router:extract-signals "How can I pay using my credit card?"
```

**Output:** a structured JSON object of the signals found — topics, keywords, intent, and other contextual attributes.

At \$0.02 / \$0.05 per 1M input/output tokens it is built for high-volume work. The window is 400 tokens, so send the passage itself rather than a whole document. For IAB audience and content categories alongside these signals, use `classify-iab-enriched`.

---

### `/zerogpu-router:summarize`

Condense a passage into a short summary.

- **Model:** `llama-3.1-8b-instruct-fast`
- **Wraps:** `zerogpu chat_completions -m llama-3.1-8b-instruct-fast`, with a system message instructing the model to summarize
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

### `/zerogpu-router:moderate`

Screen a passage for unsafe, harmful, or policy-sensitive content and get back a safety verdict.

- **Model:** `zlm-v1-moderation-edge`
- **Wraps:** `zerogpu moderations -m zlm-v1-moderation-edge`
- **When Claude auto-invokes:** "moderate this", "is this safe to publish?", "content-check this comment", screening user-generated text before it is forwarded.

**Synopsis**

```
/zerogpu-router:moderate <text>
```

**Example**

```text
/zerogpu-router:moderate "You are worthless and everyone would be better off if you disappeared."
```

**Output (illustrative)**

```json
{
  "results": [{
    "flagged": true,
    "categories": { "harassment": true, "harassment/threatening": true, "self-harm": false },
    "category_scores": { "harassment": 0.825, "harassment/threatening": 0.958, "self-harm": 0.015 }
  }]
}
```

Returns OpenAI's moderations envelope across all 13 safety categories, so it drops into any pipeline written against `omni-moderation-latest`. The model is served only by the Moderations API, so this skill calls `zerogpu moderations` rather than Chat Completions. At \$0.02 / \$0.05 per 1M tokens it is cheap enough to sit inline in front of every response your app serves.

---

### `/zerogpu-router:moderate-llama`

Screen a passage with a dedicated safety classifier that names the policy categories a violation falls under, over a context large enough for a whole transcript.

- **Model:** `llama-guard-4-12b` (dense 12B derived from Llama 4 Scout, 163,840-token context)
- **Wraps:** `zerogpu chat_completions -m llama-guard-4-12b`
- **When Claude auto-invokes:** moderation requests too long for `moderate`'s 800-token window, screening a model's own reply as well as the prompt, brand-safety and policy-enforcement checks.

**Synopsis**

```
/zerogpu-router:moderate-llama <text>
```

**Example**

```text
/zerogpu-router:moderate-llama "Screen this whole support transcript before we publish it as a case study."
```

**Output:** the model's verdict as plain text — safe or unsafe, with the relevant policy categories when it detects a violation.

It evaluates incoming prompts and generated responses, in multiple languages. At \$0.18 / \$0.18 per 1M input/output tokens it costs nine times `moderate` (`zlm-v1-moderation-edge`, \$0.02 / \$0.05) on input and under four times on output, so keep `moderate` for short passages and for OpenAI's 13-category envelope, and use this one when the text is longer or you want the violated policy categories named.

---

### `/zerogpu-router:embed`

Turn text into a 384-dimensional vector for semantic search, RAG retrieval, clustering, or deduplication.

- **Models:** `all-minilm-l6-v2` (default), `bge-small-en-v1.5` (`-m`)
- **Wraps:** `zerogpu embeddings -m all-minilm-l6-v2`
- **When Claude auto-invokes:** "embed this", "build a vector index", "find the semantically closest passage", "dedupe these by meaning."

**Synopsis**

```
/zerogpu-router:embed <text> [-m <model>]
```

**Example**

```text
/zerogpu-router:embed "ZeroGPU runs high-volume inference tasks on small models at the edge."
/zerogpu-router:embed "Long passage to index for retrieval..." -m bge-small-en-v1.5
```

**Output (illustrative, vector truncated)**

```json
{
  "data": [{ "index": 0, "embedding": [0.012601, -0.072932, 0.043332, "... 380 more"] }],
  "model": "all-MiniLM-L6-v2",
  "usage": { "prompt_tokens": 18, "total_tokens": 18 }
}
```

| Model | Params | Window | Best for |
| --- | --- | --- | --- |
| `all-minilm-l6-v2` | 22.7M | 512 tokens | General semantic similarity over short chunks |
| `bge-small-en-v1.5` | 33M | 512 tokens | English retrieval, ranking quality |

Both cost \$0.004 per 1M input tokens, bill nothing on output, and return 384-dimensional vectors, so they are interchangeable in an existing index. The models are served only by the Embeddings API, so this skill calls `zerogpu embeddings` rather than Chat Completions. Inputs past the window are truncated, so chunk long documents and embed the chunks.

---

## Skills reference

Quick lookup table: all 24 skills at a glance.

| Skill | Purpose | Example |
| --- | --- | --- |
| `/zerogpu-router:signin` | Sign in and persist API key (manual only) | `/zerogpu-router:signin` |
| `/zerogpu-router:status` | Show current sign-in status (manual only) | `/zerogpu-router:status` |
| `/zerogpu-router:cost-savings` | Show cumulative savings vs. Claude (manual only) | `/zerogpu-router:cost-savings` |
| `/zerogpu-router:chat <text>` | Default chat via `gpt-oss-120b` (131K context) | `/zerogpu-router:chat "Compare optimistic vs pessimistic locking."` |
| `/zerogpu-router:chat-liquid <text>` | Fastest, cheapest chat via `LFM2.5-1.2B-Instruct` | `/zerogpu-router:chat-liquid "Explain WebSockets in two sentences."` |
| `/zerogpu-router:chat-thinking <text>` | Chat with the Thinking variant (shows reasoning) | `/zerogpu-router:chat-thinking "If a train leaves at 3 PM going 60 mph, when does it cover 150 miles?"` |
| `/zerogpu-router:chat-qwen <text>` | Heavier multilingual chat via `qwen3-30b-a3b-fp8` | `/zerogpu-router:chat-qwen "Explica los índices B-tree en dos frases."` |
| `/zerogpu-router:chat-deepseek <text>` | Coding and agentic chat via `deepseek-v4-flash-0731` (1M context) | `/zerogpu-router:chat-deepseek "Port this module to async/await."` |
| `/zerogpu-router:chat-deepseek-v4-1-flash <text>` | V4.1 Flash: 1M context with higher-effort reasoning via `deepseek-v4.1-flash` | `/zerogpu-router:chat-deepseek-v4-1-flash "Plan the migration to the new billing API."` |
| `/zerogpu-router:chat-glm <text>` | Most capable, 262K context via `glm-5.2` (~7x the cost) | `/zerogpu-router:chat-glm "Which services would a payments outage take down?"` |
| `/zerogpu-router:classify-iab <text>` | IAB taxonomy classification | `/zerogpu-router:classify-iab "The Lakers signed a new point guard."` |
| `/zerogpu-router:classify-iab-enriched <text>` | IAB + topics/keywords/intent | `/zerogpu-router:classify-iab-enriched "Compare the Tesla Model Y and Hyundai Ioniq 5."` |
| `/zerogpu-router:classify-domain <domain>` | IAB classification from a hostname, no page fetch | `/zerogpu-router:classify-domain "espn.com"` |
| `/zerogpu-router:classify-zero-shot <text> -l …` | Zero-shot against custom labels | `/zerogpu-router:classify-zero-shot "fast laptop" -l positive -l negative` |
| `/zerogpu-router:classify-structured <text> -s '…'` | Schema-based multi-axis classification | `/zerogpu-router:classify-structured "ticket text" -s '{"sentiment":["positive","negative"]}'` |
| `/zerogpu-router:extract-entities <text> -l …` | Custom-label NER | `/zerogpu-router:extract-entities "Tim Cook met Sundar Pichai in Cupertino." -l person -l location` |
| `/zerogpu-router:extract-pii <text>` | Extract PII entities (returns JSON) | `/zerogpu-router:extract-pii "Contact Jane at jane@example.com"` |
| `/zerogpu-router:redact-pii <text>` | Mask PII in-line with `[LABEL]` placeholders | `/zerogpu-router:redact-pii "Email John at john@acme.com"` |
| `/zerogpu-router:extract-json <text> -s '…'` | Schema-driven JSON extraction | `/zerogpu-router:extract-json "..." -s '{"contact":["name::str::Full name"]}'` |
| `/zerogpu-router:extract-signals <text>` | Topics, keywords, intent and other contextual signals | `/zerogpu-router:extract-signals "How can I pay using my credit card?"` |
| `/zerogpu-router:summarize <text>` | Summarize with `llama-3.1-8b-instruct-fast` | `/zerogpu-router:summarize "The board met Thursday to review Q3 results..."` |
| `/zerogpu-router:moderate <text>` | Safety verdict across OpenAI's 13 categories | `/zerogpu-router:moderate "Screen this user comment before we publish it."` |
| `/zerogpu-router:moderate-llama <text>` | Safe/unsafe verdict with policy categories via `llama-guard-4-12b` | `/zerogpu-router:moderate-llama "Screen this whole support transcript."` |
| `/zerogpu-router:embed <text> [-m …]` | 384-dim embedding for search, RAG, dedupe | `/zerogpu-router:embed "ZeroGPU runs inference at the edge." -m bge-small-en-v1.5` |

For the options the skills pass to the CLI (`-m`, `-i`, `--metadata`, `--raw`), run `zerogpu chat_completions --help`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `zerogpu: command not found` | CLI not installed or not on `PATH` | `npm install -g zerogpu-cli`, then restart your shell |
| `error: unknown command 'chat_completions'` | CLI older than 3.8.0 | `npm install -g zerogpu-cli@latest` |
| `metadata.usecase is required for gliner models` | A hand-written `zerogpu chat_completions` call is missing `usecase` | Include `"usecase"` in `--metadata` exactly as the skill's `SKILL.md` shows |
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
