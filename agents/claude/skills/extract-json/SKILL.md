---
name: extract-json
description: Schema-driven structured JSON extraction (gliner2-base-v1). Use when the user wants to pull specific named fields out of free text into a JSON object — contact info, invoice details, order data, profile attributes — defined by a per-field type/description schema.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu chat_completions *)
---

Run structured JSON extraction. The request below holds the source text and the fields to extract, given as `-s '<json>'` or in plain words.

Run this with the Bash tool, putting the schema in `--metadata` and pasting the text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m gliner2-base-v1 --metadata '{"usecase":"json","schema":{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"json"` is required exactly as written; the API rejects the request without it.
- `schema` maps each group to its fields, and each field is `name::type::description`. If the request names fields in plain words, build the schema from them.
- `--metadata` is single-quoted JSON, so write any `'` inside a description as `'\''`.

Output is a JSON object whose `data` holds the extracted fields, keyed by group.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.

Request: $ARGUMENTS
