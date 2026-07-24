---
name: classify-structured
description: Multi-axis classification using a JSON schema mapping categories to allowed labels (gliner2-base-v1). Use when the user wants to classify text along several dimensions at once, e.g. "classify by sentiment and topic" with explicit label sets per axis.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu classify_structured*)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **Sends your input to ZeroGPU's hosted API** for inference — this is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Run schema-driven classification:

```!
zerogpu classify_structured $ARGUMENTS
```

**Quoting (required, to survive shell parsing of arbitrary user text):** format `$ARGUMENTS` with the source text wrapped via heredoc command substitution, then flags after. Inside the heredoc, paste the user's text verbatim — do not escape:

```
"$(cat <<'ZGPU_T'
<the source text, verbatim, multi-line and special chars all OK>
ZGPU_T
)" -s '{"sentiment":["positive","negative","neutral"],"topic":["support","billing","product"]}'
```

Schema is a single-quoted JSON object mapping each axis to its allowed labels. Output is a JSON object with one chosen label per category.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
