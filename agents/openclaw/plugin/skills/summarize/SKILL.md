---
name: summarize
description: Summarize a passage using ZeroGPU's llama-3.1-8b-instruct-fast edge model. Use when the user asks to summarize, condense, TL;DR, or give the gist of an article, email, transcript, or other plain-text passage.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu summarize*)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

Summarize a passage. `$ARGUMENTS` is the raw user text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu summarize "$ZGPU_TEXT"
```

Output is a short condensed summary string. For files, the user can run `zerogpu summarize "$(cat article.txt)"` directly.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
