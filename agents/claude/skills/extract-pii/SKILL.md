---
name: extract-pii
description: Extract PII entities from text (gliner-multi-pii-v1). Use when the user wants to find personally identifiable information — names, emails, phones, addresses, financial identifiers — without modifying the source text.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Extract PII entities. `$ARGUMENTS` is the raw source text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m gliner-multi-pii-v1 --metadata '{"usecase":"extract-pii","threshold":0.5,"categories":["identity","contact"]}' <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

Output is a JSON object whose `entities` lists each span with its `text`, `label`, character offsets, and `score`.

If the user wants the PII *masked in-line* rather than extracted, use `/zerogpu-router:redact-pii` instead.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
