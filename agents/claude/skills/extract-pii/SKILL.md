---
name: extract-pii
description: Extract PII entities from text (gliner-multi-pii-v1). Use when the user wants to find personally identifiable information — names, emails, phones, addresses, financial identifiers — grouped by category, without modifying the source text.
argument-hint: "<text> [-t <threshold>] [-c <categories>]"
allowed-tools: Bash(zerogpu extract_pii*)
---

Extract PII entities:

```!
zerogpu extract_pii $ARGUMENTS
```

Optional flags: `-t <threshold>` (float, default `0.5`), `-c <list>` (comma-separated categories, default `identity,contact`; other values include `financial`, `medical`, `credentials`).

If the user wants the PII *masked in-line* rather than extracted, use `/zerogpu-router:redact-pii` instead.
