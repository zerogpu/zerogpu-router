---
name: classify-zero-shot
description: Zero-shot classification against a caller-supplied list of candidate labels (deberta-v3-small). Use when the user wants to classify text into a custom set of labels they provide (e.g. "is this positive, negative, or neutral?", "tag this as bug, feature, or question").
argument-hint: "<text> (-l <label>... | --labels a,b,c) [-t <0..1>]"
allowed-tools: Bash(zerogpu classify_zero_shot*)
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

Run zero-shot classification:

```!
zerogpu classify_zero_shot $ARGUMENTS
```

**Quoting (required, to survive shell parsing of arbitrary user text):** format `$ARGUMENTS` with the input text wrapped via heredoc command substitution, then flags after. Inside the heredoc, paste the user's text verbatim — do not escape:

```
"$(cat <<'ZGPU_T'
<the input text, verbatim, multi-line and special chars all OK>
ZGPU_T
)" --labels a,b,c
```

At least one label is required — either repeat `-l <label>` or pass `--labels a,b,c`. Optional `-t <threshold>` filters labels below a confidence for multi-label output.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
