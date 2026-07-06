---
name: zerogpu_redact_pii
description: Detect and mask PII in-line via ZeroGPU, replacing it with label placeholders like [PERSON] and [EMAIL]. Use when the user asks to redact, scrub, mask, anonymize, or sanitize a passage before sharing or logging it.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu redact_pii *)
---

Mask PII in-line. `$ARGUMENTS` is the raw user text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu redact_pii "$ZGPU_TEXT"
```

Output is the original text with PII spans replaced by `[LABEL]` placeholders. To extract (not mask) PII, use `zerogpu_extract_pii` instead.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings.
