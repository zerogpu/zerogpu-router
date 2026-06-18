---
name: extract-pii
description: Extract PII entities from text (gliner-multi-pii-v1). Use when the user wants to find personally identifiable information — names, emails, phones, addresses, financial identifiers — grouped by category, without modifying the source text.
argument-hint: "<text> [-t <threshold>] [(-c | --categories) <list>]"
allowed-tools: Bash(zerogpu extract_pii*)
---

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

If the user wants the PII *masked in-line* rather than extracted, use `/zerogpu-router:redact-pii` instead.

If the command output includes a line starting with `💰 ZeroGPU savings`, relay that line to the user verbatim as a brief closing note — it shows their running ZeroGPU cost savings.
