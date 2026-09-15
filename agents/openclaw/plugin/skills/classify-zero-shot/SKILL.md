---
name: classify-zero-shot
description: Zero-shot classification against a caller-supplied list of candidate labels (deberta-v3-small). Use when the user wants to classify text into a custom set of labels they provide (e.g. "is this positive, negative, or neutral?", "tag this as bug, feature, or question").
argument-hint: "<text> (-l <label>... | --labels a,b,c)"
allowed-tools: Bash(zerogpu chat_completions *)
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

Run zero-shot classification. The user gives the text to classify and the candidate labels, as flags (`-l bug -l feature`, `--labels bug,feature`) or in plain words.

Run this with the `exec` tool, filling in the labels and pasting the text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m deberta-v3-small -i "[bug, feature, question]" <<'ZGPU_END_OF_INPUT'
<the text to classify, verbatim>
ZGPU_END_OF_INPUT
```

- The labels go in `-i` as one bracketed, comma-separated list. The model reads them from the system message and rejects a request without one.
- At least one label is required. If the user names none, ask which candidate labels to use.
- `-i` is double-quoted, so leave `"`, `$`, and backticks out of the labels.

Output is a JSON object mapping each label to its score.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
