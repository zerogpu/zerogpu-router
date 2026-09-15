---
name: classify-structured
description: Multi-axis classification using a JSON schema mapping categories to allowed labels (gliner2-base-v1). Use when the user wants to classify text along several dimensions at once, e.g. "classify by sentiment and topic" with explicit label sets per axis.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu chat_completions *)
---

Run schema-driven classification. The request below holds the text and the schema — each axis with its allowed labels — given as `-s '<json>'` or in plain words.

Run this with the Bash tool, putting the schema in `--metadata` and pasting the text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m gliner2-base-v1 --metadata '{"usecase":"classification","schema":{"sentiment":["positive","negative","neutral"],"topic":["support","billing","product"]}}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"classification"` is required exactly as written; the API rejects the request without it.
- `schema` maps each axis to its allowed labels. If the request gives axes without labels, pick sensible label sets and say which you used.
- `--metadata` is single-quoted JSON, so write any `'` inside a label as `'\''`.

Output is a JSON object whose `classification` holds one chosen label per axis.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.

Request: $ARGUMENTS
