---
name: classify-decisions
description: Dynamic-label decisions and routing with gliner2.5-decide-v1 (486M) — supply the labels or options at request time to classify intent, route agents and tools, triage support requests, make moderation decisions, and decide when a human handoff is needed. Single-label, multi-label, and several decision heads in one call. Use for high-volume routing and triage — it is the cheapest classifier on the platform and bills nothing on output.
argument-hint: "<text> -s '<json labels>'"
allowed-tools: Bash(zerogpu chat_completions *)
---

Run a dynamic-label decision. The request below holds the text and the decision heads — each head with its allowed options — given as `-s '<json>'` or in plain words.

Run this with the Bash tool, putting the heads in `--metadata` and pasting the text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m gliner2.5-decide-v1 --metadata '{"usecase":"decide","labels":{"intent":["payment_issue","refund","account_access","general_question"],"handoff":["yes","no"]}}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"decide"` is required exactly as written; the API rejects the request without it.
- `labels` maps each decision head to its allowed options, and several heads may be decided in one call. If the request gives heads without options, pick sensible option sets and say which you used.
- For plain single- or multi-label classification against a schema, `"usecase":"classification"` with a `schema` works too — the same shape `/zerogpu-router:classify-structured` uses.
- `--metadata` is single-quoted JSON, so write any `'` inside an option as `'\''`.

Output is a JSON object holding the chosen option per decision head.

At \$0.004 per 1M input tokens, billing nothing on output, this is the cheapest classifier on the platform — a fifth of `/zerogpu-router:classify-structured` on input. Prefer `classify-structured` when you want a schema-shaped classification, and this skill when you are routing or triaging at volume.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.

Request: $ARGUMENTS
