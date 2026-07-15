---
name: classify-iab-enriched
description: Enriched IAB classification — returns audience categories plus topics, keywords, and inferred intent. Use when the user wants richer ad/audience signals than plain IAB labels (e.g. "give me topics, keywords, and intent for this passage").
argument-hint: "<text>"
allowed-tools: Bash(zerogpu classify_iab_enriched*)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

Run enriched IAB classification. `$ARGUMENTS` is the raw source text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu classify_iab_enriched "$ZGPU_TEXT"
```

Output is a JSON object with `categories`, `topics`, `keywords`, and `intent`.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
