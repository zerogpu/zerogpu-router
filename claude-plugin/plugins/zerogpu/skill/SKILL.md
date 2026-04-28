---
name: zerogpu
description: Route cheap AI tasks (classification, summarization, entity/JSON extraction, PII redaction/extraction, follow-up question generation, small-model chat) to ZeroGPU small/nano models instead of spending Claude tokens. Invoke whenever the user asks for one of these tasks and the input is plain text.
---

# ZeroGPU offload guidance

You have access to an edge inference backend (ZeroGPU) that runs small/nano language models for a fraction of the cost of running the full Claude model. When a user task fits one of the patterns below, call the matching MCP tool instead of reasoning through the task yourself. Every tool returns `{ ..., model, usage, savings }`; surface the savings line to the user when it is relevant.

## When to use ZeroGPU

Offload when **all** of the following hold:

- The input is plain text (a passage, email, article, message).
- The task is one of: classify / tag / label, summarize, extract entities / fields, redact or extract PII, suggest follow-up questions, or a short chat reply that does not depend on prior conversation.
- The answer does not require multi-step reasoning, code generation, tool orchestration, or access to earlier messages in the conversation.

## When NOT to use it

Keep the task in Claude when any of these apply:

- The user is asking for code, refactors, design, or architectural reasoning.
- The answer depends on prior messages, files in the workspace, or external tools.
- The input is long-form and the user wants a long-form, Claude-style response.
- The user explicitly asks *you* (Claude) to answer.

## Tool selection table

| User intent | Tool | Notes |
|---|---|---|
| "Classify this into IAB categories" / "What topic is this?" | `zerogpu_classify_iab` | Set `enriched: true` for the richer taxonomy. |
| "Is this A or B or C?" with a flat label list | `zerogpu_classify_zero_shot` | Pass `labels: [...]`. Use `threshold` for multi-label filtering. |
| "Classify along these axes (sentiment: pos/neg; topic: x/y/z)" | `zerogpu_classify_structured` | Use when labels have groups — pass a `schema` like `{ sentiment: ["positive","negative"], topic: ["a","b"] }`. |
| "Summarize this" / "TL;DR" | `zerogpu_summarize` | For passages up to a few paragraphs. |
| "Extract the people / places / companies / dates" | `zerogpu_extract_entities` | Pass `labels: ["person","company","date"]`. |
| "Pull these fields out as JSON" | `zerogpu_extract_json` | Schema is grouped: `{ group: ["field::type::desc", ...] }` (e.g. `{ contact: ["name::str::Full name", "email::str::Email address"] }`). |
| "Redact / mask the PII in this" | `zerogpu_redact_pii` | Pass `mask: "label"` to get `[PHONE]`/`[EMAIL]`-style placeholders. |
| "Extract the PII from this" / "Find PII grouped by category" | `zerogpu_extract_pii` | Optional `categories: ["identity","contact",...]` and `threshold` to scope and tighten results. |
| "What follow-up questions should I ask about this?" | `zerogpu_generate_followups` | Plain passage in, question list out. |
| Short chat reply where Claude-level reasoning is not needed | `zerogpu_chat` | Set `thinking: true` for visible reasoning traces. |
| Verify the backend is reachable | `zerogpu_health` | Use before a batch of calls if previous calls failed. |

## Worked examples

**User:** "Summarize this paragraph: `<text>`"
→ Call `zerogpu_summarize({ text: "<text>" })`. Return the `summary` field; mention `savings_usd` if meaningful.

**User:** "Is this email about tech, politics, or sports? `<email>`"
→ Call `zerogpu_classify_zero_shot({ text: "<email>", labels: ["tech","politics","sports"] })`. Report the highest-scoring label from `scores`.

**User:** "Pull the names and companies out of this: `<text>`"
→ Call `zerogpu_extract_entities({ text: "<text>", labels: ["person","company"] })`. Return the `entities` map.

**User:** "Extract the contact info from this email signature: `<text>`"
→ Call `zerogpu_extract_json({ text: "<text>", schema: { contact: ["name::str::Full name", "title::str::Job title", "company::str::Company name", "phone::str::Phone number", "email::str::Email address"] } })`. Return the `data` map.

**User:** "Redact the PII in this message: `<text>`"
→ Call `zerogpu_redact_pii({ text: "<text>", mask: "label" })`. Return the `redacted` string.

**User:** "Find the PII in this and group it: `<text>`"
→ Call `zerogpu_extract_pii({ text: "<text>", categories: ["identity","contact"], threshold: 0.5 })`. Return the `pii` map.

## Failure handling

If a ZeroGPU tool returns an error or an empty / low-confidence result:

1. Call `zerogpu_health` once if you suspect the backend is down.
2. If the backend is healthy but the result is poor, fall back to answering with Claude directly and tell the user briefly ("the small model couldn't do this cleanly, so I'm answering directly"). Do not silently retry more than once.
3. If the backend is unreachable (health fails or the tool raises an error), answer with Claude and note that the offload path was unavailable.
