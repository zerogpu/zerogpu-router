---
name: classify-iab-enriched
description: Enriched IAB classification — returns audience categories plus topics, keywords, and inferred intent. Use when the user wants richer ad/audience signals than plain IAB labels (e.g. "give me topics, keywords, and intent for this passage").
argument-hint: "<text>"
allowed-tools: Bash(zerogpu classify_iab_enriched*)
---

Run enriched IAB classification:

```!
zerogpu classify_iab_enriched $ARGUMENTS
```

Pass the source text as a single quoted argument. Output is a JSON object with `categories`, `topics`, `keywords`, and `intent`.
