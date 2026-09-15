---
name: classify-structured
description: Multi-axis classification using a JSON schema mapping categories to allowed labels (gliner2-base-v1). Use when the user wants to classify text along several dimensions at once, e.g. "classify by sentiment and topic" with explicit label sets per axis.
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

Run schema-driven classification. The user gives the text and the schema — each axis with its allowed labels — as `-s '<json>'` or in plain words.

Run this with the `exec` tool, putting the schema in `--metadata` and pasting the text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m gliner2-base-v1 --metadata '{"usecase":"classification","schema":{"sentiment":["positive","negative","neutral"],"topic":["support","billing","product"]}}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"classification"` is required exactly as written; the API rejects the request without it.
- `schema` maps each axis to its allowed labels. If the user gives axes without labels, pick sensible label sets and say which you used.
- `--metadata` is single-quoted JSON, so write any `'` inside a label as `'\''`.

Output is a JSON object whose `classification` holds one chosen label per axis.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
