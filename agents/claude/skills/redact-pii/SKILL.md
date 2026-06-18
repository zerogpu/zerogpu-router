---
name: redact-pii
description: Detect and mask PII in-line in the text, replacing it with label placeholders like [PERSON] and [EMAIL]. Use when the user asks to redact, scrub, mask, anonymize, or sanitize a passage before sharing or logging it.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu redact_pii*)
---

Mask PII in-line. `$ARGUMENTS` is the raw user text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu redact_pii "$ZGPU_TEXT"
```

Output is the original text with PII spans replaced by `[LABEL]` placeholders. For extracting (not masking) PII, use `/zerogpu-router:extract-pii`.

If the command output includes a line starting with `💰 ZeroGPU savings`, relay that line to the user verbatim as a brief closing note — it shows their running ZeroGPU cost savings.
