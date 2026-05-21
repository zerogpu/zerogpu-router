---
description: Route PII redaction through ZeroGPU instead of Claude
argument-hint: <text to redact>
---

Call `zerogpu_redact_pii` with `mask: "label"` on the text below and return the `redacted` string. If the user instead wants PII extracted and grouped, call `zerogpu_extract_pii` and return the `pii` map.

Text:
$ARGUMENTS
