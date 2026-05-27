---
name: classify-iab
description: Classify text against the IAB content/audience taxonomy. Use when the user asks for IAB categories, ad-taxonomy labels, or "what topic is this article about" against a standard taxonomy.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu classify_iab *)
---

Run IAB classification. `$ARGUMENTS` is the raw source text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu classify_iab "$ZGPU_TEXT"
```

Output is a JSON list of IAB categories with confidence scores.
