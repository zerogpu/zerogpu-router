---
name: extract-pii
description: Extract PII entities from text (gliner-multi-pii-v1). Use when the user wants to find personally identifiable information — names, emails, phones, addresses, financial identifiers — grouped by category, without modifying the source text.
argument-hint: "<text> [-t <threshold>] [(-c | --categories) <list>]"
allowed-tools: Bash(zerogpu extract_pii*)
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

Extract PII entities:

```!
zerogpu extract_pii $ARGUMENTS
```

**Quoting (required, to survive shell parsing of arbitrary user text):** format `$ARGUMENTS` with the source text wrapped via heredoc command substitution, then flags after. Inside the heredoc, paste the user's text verbatim — do not escape:

```
"$(cat <<'ZGPU_T'
<the source text, verbatim, multi-line and special chars all OK>
ZGPU_T
)" [-t 0.5] [-c identity,contact]
```

Optional flags: `-t <threshold>` (float, default `0.5`), `-c <list>` (comma-separated categories, default `identity,contact`; other values include `financial`, `medical`, `credentials`).

If the user wants the PII *masked in-line* rather than extracted, use `redact-pii` instead.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
