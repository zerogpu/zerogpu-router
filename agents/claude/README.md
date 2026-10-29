# ZeroGPU Router for Claude Code

Offload cheap, well-defined NLP tasks (classification, summarization, entity & JSON extraction, transcription and speech, short chat) from Claude to ZeroGPU's edge-optimized small language models, directly from your Claude Code session.

Every ZeroGPU task is exposed as a Claude Code skill. Each skill names its own model and calls the `zerogpu` CLI's model-agnostic endpoint commands (`chat_completions`, `moderations`, `embeddings`), so the plugin keeps working when the CLI's model list changes. Claude auto-invokes the right skill when your request matches (e.g. "extract the people and companies from this", "summarize this article", "classify this by sentiment and topic"), or you can call any of them by name with `/zerogpu-router:<skill>`.

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
Pull every person, company, and email address out of this support ticket:

Hi team, this is Sarah Chen (sarah.chen@northwind-labs.com, +1 415-555-0182).
Our prod database started throwing connection timeouts around 2:14 AM PT last
night. The on-call engineer Marcus Rivera (slack: @mrivera) restarted the
pgbouncer pod but the issue came back within 20 minutes. Billing should go to
our CFO Priya Patel at priya.patel@northwind-labs.com, billing address 1455
Market St, Suite 600, San Francisco, CA 94103. Please call me back at the
number above.
```
→ Claude routes to `extract-entities` with the labels you named, and `gliner2.5-base-v1` returns the spans it found for each one. The labels are yours to choose, so project-specific identifiers (internal hostnames, contract numbers, card last-fours) work as well as the standard entity types — name them in the request. For a passage that is not in English, Claude routes to `extract-entities-multi` instead.

```text
Read this release note aloud so I can check how it sounds.
```
→ Claude routes to `speak`.

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
/zerogpu-router:extract-entities "Email John Smith at john@acme.com about invoice 12345." -l person -l email
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

Every routed call (chat, classify, extract, summarize, …) records the frontier-model tokens it offloaded and the estimated dollars saved, persisted in `~/.zerogpu/savings.json` alongside your credentials. **Token counts are actual** (the API's usage report). The **dollar figure is a rounded estimate** of the frontier-model spend avoided: what those exact tokens would have cost on the baseline model minus the real ZeroGPU cost. The baseline defaults to `claude-opus-4-8` and is overridable via the `ZEROGPU_SAVINGS_MODEL` environment variable (e.g. `claude-sonnet-4-6`).

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

Reach for `chat-liquid` when speed and cost matter more than quality, `chat-thinking` for a visible reasoning trace, or `chat-qwen` for multilingual prompts. When the input exceeds this model's 131K context, use `chat-glm-5-3-flash` or `chat-deepseek-v4-1-flash` for code and agentic work, or `chat-gpt-4-1-mini` when instruction following and tool calling matter most — `glm-5.3-flash`, `deepseek-v4.1-flash`, and `gpt-4.1-mini` each carry a 1M-token context.

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

### `/zerogpu-router:chat-qwen3-6-35b-a3b`

A fast, open-weight Mixture-of-Experts model with structured output and tool calling, over the smallest context window of the chat models.

- **Model:** `qwen3.6-35b-a3b` (35B Mixture-of-Experts, 16,384-token context)
- **Wraps:** `zerogpu chat_completions -m qwen3.6-35b-a3b`
- **When Claude auto-invokes:** content extraction and agent workflows over a passage that fits in 16K tokens, where structured output or tool calling matters.

**Synopsis**

```
/zerogpu-router:chat-qwen3-6-35b-a3b <text>
```

**Example**

```text
/zerogpu-router:chat-qwen3-6-35b-a3b Pull the owner, severity, and next action out of each incident note below, as JSON.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

At \$0.20 / \$1.50 per 1M input/output tokens it costs twice `chat-qwen` on input and over three times on output, over half its context, so `chat-qwen` is the better default for text. Its 16,384-token window is the smallest of the chat models. The model accepts images and video, but this skill sends the request as text through `chat_completions`, so image and video prompts are out of its reach.

---

### `/zerogpu-router:chat-deepseek-v4-1-flash`

The V4.1 Flash line: a 1M-token context on DeepSeek's Causal Encoder-Decoder architecture, with function calling and a higher-effort reasoning mode alongside fast non-thinking replies.

- **Model:** `deepseek-v4.1-flash` (sparse MoE, 8B active on input and 16B on output, 1,048,576-token context)
- **Wraps:** `zerogpu chat_completions -m deepseek-v4.1-flash`
- **When Claude auto-invokes:** large codebases, long documents, extended conversations, and multi-step agent tasks where the extra reasoning effort or function calling is worth it.

**Synopsis**

```
/zerogpu-router:chat-deepseek-v4-1-flash <text>
```

**Example**

```text
/zerogpu-router:chat-deepseek-v4-1-flash Here is the whole service package. Plan the migration to the new billing API, step by step, and flag every call site that changes.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

At \$0.30 / \$1.20 per 1M input/output tokens this is the middle of the three 1M-context models — three times `chat-glm-5-3-flash` on input and over three times on output, and roughly three quarters of `chat-gpt-4-1-mini` on both. For ordinary coding and agentic work at the same context size, `chat-glm-5-3-flash` is cheaper.

---

### `/zerogpu-router:chat-glm-5-3-flash`

Z.ai's efficient open-weight model for coding and long-horizon agent work: hybrid sparse and linear attention over a 1M-token context, with function calling and adjustable reasoning effort.

- **Model:** `glm-5.3-flash` (1,048,576-token context)
- **Wraps:** `zerogpu chat_completions -m glm-5.3-flash`
- **When Claude auto-invokes:** repo-scale code questions, long documents, and multi-step agent runs where the input is too large for `chat`'s 131K context and price matters.

**Synopsis**

```
/zerogpu-router:chat-glm-5-3-flash <text>
```

**Example**

```text
/zerogpu-router:chat-glm-5-3-flash Here is the whole service package. Plan the migration to the new billing API, step by step.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

At \$0.10 / \$0.35 per 1M input/output tokens this is the cheapest of the three 1M-context models — a third of `chat-deepseek-v4-1-flash` on input and under a third on output, and a quarter of `chat-gpt-4-1-mini` on input and under a quarter on output.

---

### `/zerogpu-router:chat-gpt-4-1-mini`

OpenAI's fast, cost-efficient GPT-4.1 model: strong instruction following and tool calling across a 1M-token context at low latency.

- **Model:** `gpt-4.1-mini` (1,047,576-token context)
- **Wraps:** `zerogpu chat_completions -m gpt-4.1-mini`
- **When Claude auto-invokes:** very large inputs where instruction fidelity, function calling, or structured outputs matter more than price.

**Synopsis**

```
/zerogpu-router:chat-gpt-4-1-mini <text>
```

**Example**

```text
/zerogpu-router:chat-gpt-4-1-mini Here is our full API spec. Generate a typed client, following the conventions in the existing SDK verbatim.
```

**Output:** the assistant's answer as plain text.

At \$0.40 / \$1.60 per 1M input/output tokens this is the priciest of the three 1M-context models — four times `chat-glm-5-3-flash` on input and over four times on output, and a third again as much as `chat-deepseek-v4-1-flash` on both. It is the most expensive model on the platform, roughly 2.7x `chat` on input and output alike and twenty times the 1.2B edge models on input.

---

### `/zerogpu-router:chat-gpt-5-6-luna`

The cost-optimized model of OpenAI's GPT-5.6 family, for cost-sensitive, high-volume work: adjustable reasoning effort, function calling, and structured outputs over a 272K-token context.

- **Model:** `gpt-5.6-luna` (272,000-token context)
- **Wraps:** `zerogpu chat_completions -m gpt-5.6-luna`
- **When Claude auto-invokes:** high-volume coding, chat, reasoning, RAG, summarization, and translation work that exceeds `chat`'s 131K context.

**Synopsis**

```
/zerogpu-router:chat-gpt-5-6-luna <text>
```

**Example**

```text
/zerogpu-router:chat-gpt-5-6-luna Summarize this quarter's full incident log and group the incidents by root cause.
```

**Output:** the assistant's answer as plain text. Its reasoning trace comes back in a separate field and is not printed.

At \$0.20 / \$1.20 per 1M input/output tokens it costs twice `chat-gpt-6-luna` on input and over twice on output, over the same 272K window, and a third more than `chat` on input with twice its output price. For a prompt that fits in 131K tokens, `chat` is cheaper on both.

---

### `/zerogpu-router:chat-gpt-5-4-nano`

The most cost-efficient model in OpenAI's GPT-5.4 family, built for high-volume and latency-sensitive work — classification, extraction, routing, sub-agent tasks — with function calling and structured outputs.

- **Model:** `gpt-5.4-nano` (400,000-token context)
- **Wraps:** `zerogpu chat_completions -m gpt-5.4-nano`
- **When Claude auto-invokes:** throughput- and latency-sensitive prompts, routing and sub-agent steps, or extraction over inputs too large for `chat`'s 131K context.

**Synopsis**

```
/zerogpu-router:chat-gpt-5-4-nano <text>
```

**Example**

```text
/zerogpu-router:chat-gpt-5-4-nano Route each of these 200 support tickets to the right queue and return one line per ticket.
```

**Output:** the assistant's answer as plain text.

At \$0.20 / \$1.25 per 1M input/output tokens it matches `chat-gpt-5-6-luna` on input and costs marginally more on output, over a 400K window rather than 272K. It is twice `chat-gpt-6-luna` on input and two and a half times on output.

---

### `/zerogpu-router:chat-gpt-6-luna`

The most efficient model of OpenAI's GPT-6 family, built for high-volume, cost-sensitive work: adjustable reasoning effort, function calling, and structured outputs over a 272K-token context.

- **Model:** `gpt-6-luna` (272,000-token context)
- **Wraps:** `zerogpu chat_completions -m gpt-6-luna`
- **When Claude auto-invokes:** high-volume coding, chat, reasoning, RAG, summarization, and translation work that exceeds `chat`'s 131K context and should cost as little as possible.

**Synopsis**

```
/zerogpu-router:chat-gpt-6-luna <text>
```

**Example**

```text
/zerogpu-router:chat-gpt-6-luna Summarize this quarter's full incident log and group the incidents by root cause.
```

**Output:** the assistant's answer as plain text.

At \$0.10 / \$0.50 per 1M input/output tokens it costs half `chat-gpt-5-6-luna` on input and under half on output, over the same 272K window, and two thirds of `chat` on input for a window twice as large. Prefer it over `chat-gpt-5-6-luna` unless the task specifically wants GPT-5.6's behaviour.

---

### `/zerogpu-router:decide-tools`

Turn a request into a tool decision: which tool to call and the inputs to call it with, in a single inference step, or `NO_TOOL` when none is needed.

- **Model:** `zlm-v1-tool-decisions` (0.6B, 24,576-token context)
- **Wraps:** `zerogpu chat_completions -m zlm-v1-tool-decisions`
- **When Claude auto-invokes:** agent routing questions — "which tool should handle this?", "does this need a tool at all?" — rather than requests to answer the question itself.

**Synopsis**

```
/zerogpu-router:decide-tools <text>
```

**Example**

```text
/zerogpu-router:decide-tools Will it rain in Austin this week, and what is the latest news on the Longhorns?
```

**Output:** the model's decision as plain text — the tool it selected and the inputs it generated, or `NO_TOOL`.

At \$0.05 / \$0.15 per 1M input/output tokens it costs a third of `chat` on input and a quarter on output, small enough to sit in front of every turn of an agent loop.

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

- **Model:** `gliner2.5-base-v1`
- **Wraps:** `zerogpu chat_completions -m gliner2.5-base-v1` with `usecase: "classification"`
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

### `/zerogpu-router:classify-decisions`

Dynamic-label decisions and routing: supply the decision heads and their options at request time, and get one chosen option per head.

- **Model:** `gliner2.5-decide-v1` (486M)
- **Wraps:** `zerogpu chat_completions -m gliner2.5-decide-v1` with `usecase: "decide"`
- **When Claude auto-invokes:** "which queue does this ticket belong in?", intent detection, triage, agent and tool routing, deciding when a human handoff is needed.

**Synopsis**

```
/zerogpu-router:classify-decisions <text> -s '<json labels>'
```

**Arguments**

| Name | Required | Description |
| --- | --- | --- |
| `text` | yes | Text to decide on. |
| `-s`, `--schema <json>` | **yes** | JSON object mapping each decision head to its allowed options. |

Claude reads the arguments and runs the command itself, sending the heads as `metadata` with `usecase: "decide"`. Several heads may be decided in one call.

**Example**

```text
/zerogpu-router:classify-decisions "The customer says their payment failed and they want someone to call them." \
  -s '{"intent":["payment_issue","refund","account_access","general_question"],"handoff":["yes","no"]}'
```

**Output:** a JSON object holding the chosen option per decision head.

At \$0.004 per 1M input tokens, billing nothing on output, it is the cheapest classifier on the platform — a fifth of `classify-structured` on input. Use `classify-structured` for schema-shaped classification and this one for routing and triage at volume.

---

### `/zerogpu-router:extract-entities`

Custom-label named-entity recognition. You define the entity labels; the model finds spans.

- **Model:** `gliner2.5-base-v1`
- **Wraps:** `zerogpu chat_completions -m gliner2.5-base-v1` with `usecase: "ner"`
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

### `/zerogpu-router:extract-entities-multi`

Custom-label named-entity recognition for text that is not in English. You define the entity labels; the model finds spans.

- **Model:** `gliner2.5-multi-v1` (287M, built on mDeBERTa-v3-base)
- **Wraps:** `zerogpu chat_completions -m gliner2.5-multi-v1` with `usecase: "ner"`
- **When Claude auto-invokes:** entity extraction from non-English passages — "extract the people and companies from this German contract."

**Synopsis**

```
/zerogpu-router:extract-entities-multi <text> (-l <label>... | --labels a,b,c) [-t <0..1>]
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
/zerogpu-router:extract-entities-multi "Tim Cook traf Sundar Pichai am Montag in Cupertino." \
  --labels person,organization,location -t 0.4
```

**Output:** a JSON object whose `entities` maps each label to the spans found.

At \$0.02 / \$0.05 per 1M input/output tokens it matches `extract-entities` exactly, so the choice is about language, not cost. It also supports `usecase: "json"` and `usecase: "classification"`, the shapes `extract-json` and `classify-structured` use.

---

### `/zerogpu-router:extract-json`

Pull specific named fields out of free text into a structured JSON object, defined by a per-field schema.

- **Model:** `gliner2.5-base-v1`
- **Wraps:** `zerogpu chat_completions -m gliner2.5-base-v1` with `usecase: "json"`
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

At \$0.04 / \$0.10 per 1M input/output tokens it is built for high-volume work. The window is 400 tokens, so send the passage itself rather than a whole document. For IAB audience and content categories alongside these signals, use `classify-iab-enriched`.

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

### `/zerogpu-router:summarize-llama-3-2-3b`

Condense a passage into a short summary on the smaller, cheaper of the two summarization models.

- **Model:** `llama-3.2-3b-instruct-fast` (3B, 131,072-token context)
- **Wraps:** `zerogpu chat_completions -m llama-3.2-3b-instruct-fast`, with a system message instructing the model to summarize
- **When Claude auto-invokes:** "summarize", "TL;DR", "condense this" where cost or throughput matters more than summary depth.

**Synopsis**

```
/zerogpu-router:summarize-llama-3-2-3b <text>
```

**Example**

```text
/zerogpu-router:summarize-llama-3-2-3b "The board met Thursday to review Q3 results..."
```

**Output:** a short condensed summary string.

At \$0.05 / \$0.30 per 1M input/output tokens it costs a third of `summarize` on input and marginally more on output, over the same 131K context. It shares `llama-3.1-8b-instruct-fast`'s summarization pipeline at 3B parameters rather than 8B, so prefer `summarize` when summary quality matters.

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

Returns OpenAI's moderations envelope across all 13 safety categories, so it drops into any pipeline written against `omni-moderation-latest`. The model is served only by the Moderations API, so this skill calls `zerogpu moderations` rather than Chat Completions. At \$0.10 / \$0.15 per 1M tokens it is cheap enough to sit inline in front of every response your app serves.

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

It evaluates incoming prompts and generated responses, in multiple languages. At \$0.18 / \$0.18 per 1M input/output tokens it costs under twice `moderate` (`zlm-v1-moderation-edge`, \$0.10 / \$0.15) on input and a fifth more on output, so keep `moderate` for short passages and for OpenAI's 13-category envelope, and use this one when the text is longer or you want the violated policy categories named.

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

### `/zerogpu-router:transcribe`

Turn speech into text with the smallest model in the Whisper family, for high-volume and latency-sensitive audio.

- **Model:** `whisper-tiny` (39M)
- **Wraps:** `zerogpu chat_completions -m whisper-tiny`
- **When Claude auto-invokes:** "transcribe this", meeting transcription, subtitles, podcast and voice-agent audio, audio indexing.

**Synopsis**

```
/zerogpu-router:transcribe <request>
```

**Example**

```text
/zerogpu-router:transcribe Transcribe this call segment.
```

**Output:** the model's response as the API returns it.

It recognizes speech across many languages and can translate speech into English. At \$0.02 per minute of audio it is priced for high-volume transcription and bills nothing per token.

This skill sends the request as text, which is what `zerogpu chat_completions` carries, so it cannot upload a recording on its own: the audio has to be supplied in the form the ZeroGPU API accepts for this model. See [docs.zerogpu.ai](https://docs.zerogpu.ai).

---

### `/zerogpu-router:speak`

Generate speech from text, with expressive delivery and voice cloning, at low latency.

- **Model:** `chatterbox-nano` (110M, Resemble AI)
- **Wraps:** `zerogpu chat_completions -m chatterbox-nano`
- **When Claude auto-invokes:** "read this aloud", "narrate this", "turn this into audio" — voice agents, accessibility, audiobooks, content creation.

**Synopsis**

```
/zerogpu-router:speak <text>
```

**Example**

```text
/zerogpu-router:speak Read this release note aloud so I can check how it sounds.
```

**Output:** the model's response as the API returns it. An encoded audio payload is not printed back to the user. `zerogpu chat_completions` writes to stdout and takes no output-file option, so this skill does not save a playable file.

At \$0.01 per minute of generated audio it is the cheapest audio model on the platform and bills nothing per token.

---

## Skills reference

Quick lookup table: all 32 skills at a glance.

| Skill | Purpose | Example |
| --- | --- | --- |
| `/zerogpu-router:signin` | Sign in and persist API key (manual only) | `/zerogpu-router:signin` |
| `/zerogpu-router:status` | Show current sign-in status (manual only) | `/zerogpu-router:status` |
| `/zerogpu-router:cost-savings` | Show cumulative savings vs. Claude (manual only) | `/zerogpu-router:cost-savings` |
| `/zerogpu-router:chat <text>` | Default chat via `gpt-oss-120b` (131K context) | `/zerogpu-router:chat "Compare optimistic vs pessimistic locking."` |
| `/zerogpu-router:chat-liquid <text>` | Fastest, cheapest chat via `LFM2.5-1.2B-Instruct` | `/zerogpu-router:chat-liquid "Explain WebSockets in two sentences."` |
| `/zerogpu-router:chat-thinking <text>` | Chat with the Thinking variant (shows reasoning) | `/zerogpu-router:chat-thinking "If a train leaves at 3 PM going 60 mph, when does it cover 150 miles?"` |
| `/zerogpu-router:chat-qwen <text>` | Heavier multilingual chat via `qwen3-30b-a3b-fp8` | `/zerogpu-router:chat-qwen "Explica los índices B-tree en dos frases."` |
| `/zerogpu-router:chat-qwen3-6-35b-a3b <text>` | 35B MoE chat with structured output and tool calling via `qwen3.6-35b-a3b` | `/zerogpu-router:chat-qwen3-6-35b-a3b "Pull owner and severity out of each incident note, as JSON."` |
| `/zerogpu-router:chat-deepseek-v4-1-flash <text>` | V4.1 Flash: 1M context with higher-effort reasoning via `deepseek-v4.1-flash` | `/zerogpu-router:chat-deepseek-v4-1-flash "Plan the migration to the new billing API."` |
| `/zerogpu-router:chat-glm-5-3-flash <text>` | Cheapest 1M context, coding and long-horizon agents via `glm-5.3-flash` | `/zerogpu-router:chat-glm-5-3-flash "Plan the migration to the new billing API."` |
| `/zerogpu-router:chat-gpt-4-1-mini <text>` | 1M context with strong instruction following and tool calling via `gpt-4.1-mini` | `/zerogpu-router:chat-gpt-4-1-mini "Generate a typed client from this API spec."` |
| `/zerogpu-router:chat-gpt-5-6-luna <text>` | Cost-optimized GPT-5.6, 272K context via `gpt-5.6-luna` | `/zerogpu-router:chat-gpt-5-6-luna "Summarize this quarter's incident log."` |
| `/zerogpu-router:chat-gpt-5-4-nano <text>` | High-volume, latency-sensitive routing and extraction, 400K context via `gpt-5.4-nano` | `/zerogpu-router:chat-gpt-5-4-nano "Route each of these tickets to a queue."` |
| `/zerogpu-router:chat-gpt-6-luna <text>` | Most efficient GPT-6, 272K context via `gpt-6-luna` | `/zerogpu-router:chat-gpt-6-luna "Summarize this quarter's incident log."` |
| `/zerogpu-router:decide-tools <text>` | Pick a tool and generate its arguments via `zlm-v1-tool-decisions` | `/zerogpu-router:decide-tools "Will it rain in Austin this week?"` |
| `/zerogpu-router:classify-iab <text>` | IAB taxonomy classification | `/zerogpu-router:classify-iab "The Lakers signed a new point guard."` |
| `/zerogpu-router:classify-iab-enriched <text>` | IAB + topics/keywords/intent | `/zerogpu-router:classify-iab-enriched "Compare the Tesla Model Y and Hyundai Ioniq 5."` |
| `/zerogpu-router:classify-domain <domain>` | IAB classification from a hostname, no page fetch | `/zerogpu-router:classify-domain "espn.com"` |
| `/zerogpu-router:classify-zero-shot <text> -l …` | Zero-shot against custom labels | `/zerogpu-router:classify-zero-shot "fast laptop" -l positive -l negative` |
| `/zerogpu-router:classify-structured <text> -s '…'` | Schema-based multi-axis classification | `/zerogpu-router:classify-structured "ticket text" -s '{"sentiment":["positive","negative"]}'` |
| `/zerogpu-router:classify-decisions <text> -s '…'` | Dynamic-label decisions, intent and routing | `/zerogpu-router:classify-decisions "their payment failed" -s '{"intent":["payment_issue","refund"]}'` |
| `/zerogpu-router:extract-entities <text> -l …` | Custom-label NER | `/zerogpu-router:extract-entities "Tim Cook met Sundar Pichai in Cupertino." -l person -l location` |
| `/zerogpu-router:extract-entities-multi <text> -l …` | Custom-label NER for non-English text | `/zerogpu-router:extract-entities-multi "Tim Cook traf Sundar Pichai in Cupertino." -l person -l location` |
| `/zerogpu-router:extract-json <text> -s '…'` | Schema-driven JSON extraction | `/zerogpu-router:extract-json "..." -s '{"contact":["name::str::Full name"]}'` |
| `/zerogpu-router:extract-signals <text>` | Topics, keywords, intent and other contextual signals | `/zerogpu-router:extract-signals "How can I pay using my credit card?"` |
| `/zerogpu-router:summarize <text>` | Summarize with `llama-3.1-8b-instruct-fast` | `/zerogpu-router:summarize "The board met Thursday to review Q3 results..."` |
| `/zerogpu-router:summarize-llama-3-2-3b <text>` | Cheaper summaries with `llama-3.2-3b-instruct-fast` | `/zerogpu-router:summarize-llama-3-2-3b "The board met Thursday to review Q3 results..."` |
| `/zerogpu-router:moderate <text>` | Safety verdict across OpenAI's 13 categories | `/zerogpu-router:moderate "Screen this user comment before we publish it."` |
| `/zerogpu-router:moderate-llama <text>` | Safe/unsafe verdict with policy categories via `llama-guard-4-12b` | `/zerogpu-router:moderate-llama "Screen this whole support transcript."` |
| `/zerogpu-router:embed <text> [-m …]` | 384-dim embedding for search, RAG, dedupe | `/zerogpu-router:embed "ZeroGPU runs inference at the edge." -m bge-small-en-v1.5` |
| `/zerogpu-router:transcribe <request>` | Speech to text via `whisper-tiny` | `/zerogpu-router:transcribe "Transcribe this call segment."` |
| `/zerogpu-router:speak <text>` | Text to speech via `chatterbox-nano` | `/zerogpu-router:speak "Read this release note aloud."` |

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
