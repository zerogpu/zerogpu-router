---
name: zerogpu_generate_followups
description: Generate follow-up questions from a passage via ZeroGPU. Use when the user wants suggested next questions to ask about an article, email, transcript, or other plain-text passage.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu generate_followups *)
---

Generate follow-up questions. `$ARGUMENTS` is the raw source text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu generate_followups "$ZGPU_TEXT"
```

Output is a JSON list of follow-up questions.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings.
