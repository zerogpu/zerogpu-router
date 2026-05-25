---
name: redact-pii
description: Detect and mask PII in-line in the text, replacing it with label placeholders like [PERSON] and [EMAIL]. Use when the user asks to redact, scrub, mask, anonymize, or sanitize a passage before sharing or logging it.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu redact_pii*)
---

Mask PII in-line:

```!
zerogpu redact_pii $ARGUMENTS
```

Output is the original text with PII spans replaced by `[LABEL]` placeholders. For extracting (not masking) PII, use `/zerogpu-router:extract-pii`.
