---
name: redact-pii
description: Detect and mask PII in-line in the text, replacing it with label placeholders like [PERSON] and [EMAIL]. Use when the user asks to redact, scrub, mask, anonymize, or sanitize a passage before sharing or logging it.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu redact_pii*)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **Sends the raw, un-redacted text to ZeroGPU's hosted API** — detection runs server-side, so the PII reaches the third-party service *before* it is masked. This reduces what you forward downstream, not what reaches ZeroGPU. Don't submit regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Mask PII in-line. `$ARGUMENTS` is the raw user text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu redact_pii "$ZGPU_TEXT"
```

Output is the original text with PII spans replaced by `[LABEL]` placeholders. To extract (not mask) PII, use `extract-pii` instead.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
