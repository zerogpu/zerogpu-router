---
name: generate-followups
description: Generate natural follow-up questions a reader would ask next about a passage (zlm-v1-followup-questions-edge). Use when the user wants suggested next questions, "people also ask" style prompts, or conversation continuations for an article, answer, or chat turn.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu generate_followups*)
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

Generate follow-up questions. `$ARGUMENTS` is the raw source text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu generate_followups "$ZGPU_TEXT"
```

Output is a JSON array of question strings. Relay them as-is — do not rewrite, reorder, or add your own questions.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
