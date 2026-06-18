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

**Quoting (required, to survive shell parsing of arbitrary user text):** format `$ARGUMENTS` with the source text wrapped via heredoc command substitution, then flags after. Inside the heredoc, paste the user's text verbatim — do not escape:

```
"$(cat <<'ZGPU_T'
<the source text, verbatim, multi-line and special chars all OK>
ZGPU_T
)" --labels person,company,date [-t 0.3]
```

At least one `-l <label>` (or `--labels a,b,c`) is required. Optional `-t <threshold>` filters spans below a confidence (default `0.3`, must be in `[0, 1]`).

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
