---
name: zerogpu-classify-structured
description: Multi-axis classification using a JSON schema mapping categories to allowed labels (gliner2-base-v1). Use when the user wants to classify text along several dimensions at once, e.g. "classify by sentiment and topic" with explicit label sets per axis.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu classify_structured*)
---

Run schema-driven classification:

```!
zerogpu classify_structured $ARGUMENTS
```

Schema shape (required, single-quoted JSON):

```
{"sentiment":["positive","negative","neutral"],"topic":["support","billing","product"]}
```

Output is a JSON object with one chosen label per category.
