---
name: extract-json
description: Schema-driven structured JSON extraction (gliner2-base-v1). Use when the user wants to pull specific named fields out of free text into a JSON object — contact info, invoice details, order data, profile attributes — defined by a per-field type/description schema.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu chat_completions *)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **Sends your input to ZeroGPU's hosted API** for inference — this is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Run structured JSON extraction. The user gives the source text and the fields to extract, as `-s '<json>'` or in plain words.

Run this with the `exec` tool, putting the schema in `--metadata` and pasting the text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m gliner2-base-v1 --metadata '{"usecase":"json","schema":{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"json"` is required exactly as written; the API rejects the request without it.
- `schema` maps each group to its fields, and each field is `name::type::description`. If the user names fields in plain words, build the schema from them.
- `--metadata` is single-quoted JSON, so write any `'` inside a description as `'\''`.

Output is a JSON object whose `data` holds the extracted fields, keyed by group.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
