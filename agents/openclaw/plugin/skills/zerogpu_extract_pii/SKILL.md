---
name: zerogpu_extract_pii
description: Extract PII entities from text via ZeroGPU. Use when the user wants to find personally identifiable information — names, emails, phones, addresses, financial identifiers — grouped by category, without modifying the source text.
argument-hint: "<text> [-t <threshold>] [(-c | --categories) <list>]"
allowed-tools: Bash(zerogpu extract_pii *)
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

Optional flags: `-t <threshold>` (float, default `0.5`), `-c <list>` (comma-separated categories, default `identity,contact`; other values include `financial`, `medical`, `credentials`). To mask PII in-line instead of extracting it, use `zerogpu_redact_pii`.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings.
