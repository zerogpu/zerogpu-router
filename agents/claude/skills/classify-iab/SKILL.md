---
name: classify-iab
description: Classify text against the IAB content/audience taxonomy. Use when the user asks for IAB categories, ad-taxonomy labels, or "what topic is this article about" against a standard taxonomy.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu classify_iab*)
---

Run IAB classification:

```!
zerogpu classify_iab $ARGUMENTS
```

Pass the source text as a single quoted argument. Output is a JSON list of IAB categories with confidence scores.
