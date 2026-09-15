---
name: extract-pii
description: Extract PII entities from text (gliner-multi-pii-v1). Use when the user wants to find personally identifiable information — names, emails, phones, addresses, financial identifiers — grouped by category, without modifying the source text.
argument-hint: "<text> [-t <threshold>] [(-c | --categories) <list>]"
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

> **Sends the raw text to ZeroGPU's hosted API** — detection runs server-side, so the PII reaches the third-party service in full. Don't submit regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Extract PII entities. Run this with the `exec` tool, pasting the source text into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m gliner-multi-pii-v1 --metadata '{"usecase":"extract-pii","threshold":0.5,"categories":["identity","contact"]}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"extract-pii"` is required exactly as written; the API rejects the request without it.
- `threshold` is the minimum confidence; use `0.5` unless the user gives one (`-t`).
- `categories` defaults to `identity` and `contact`. If the user asks for others (`-c`), list them — other values include `financial`, `medical`, and `credentials`.

Output is a JSON object whose `entities` lists each span with its `text`, `label`, character offsets, and `score`.

If the user wants the PII *masked in-line* rather than extracted, use `redact-pii` instead.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
