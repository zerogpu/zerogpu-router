---
name: extract-entities
description: Custom-label named-entity recognition (gliner2-base-v1). Use when the user wants to extract entities with their own labels — people, organizations, locations, products, dates, or any caller-defined entity types — from a passage.
argument-hint: "<text> (-l <label>... | --labels a,b,c) [-t <0..1>]"
allowed-tools: Bash(zerogpu extract_entities*)
---

Run custom-label NER:

```!
zerogpu extract_entities $ARGUMENTS
```

At least one `-l <label>` (or `--labels a,b,c`) is required. Optional `-t <threshold>` filters spans below a confidence (default `0.3`, must be in `[0, 1]`).
