---
name: classify-iab-enriched
description: Enriched IAB classification — returns audience categories plus topics, keywords, and inferred intent. Use when the user wants richer ad/audience signals than plain IAB labels (e.g. "give me topics, keywords, and intent for this passage").
argument-hint: "<text>"
allowed-tools: Bash(zerogpu classify_iab_enriched*)
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

If the command output includes a line starting with `💰 ZeroGPU savings`, relay that line to the user verbatim as a brief closing note — it shows their running ZeroGPU cost savings.
