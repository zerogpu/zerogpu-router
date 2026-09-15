---
name: redact-pii
description: Detect and mask PII in-line in the text, replacing it with label placeholders like [PERSON] and [EMAIL]. Use when the user asks to redact, scrub, mask, anonymize, or sanitize a passage before sharing or logging it.
argument-hint: "<text>"
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

> **Sends the raw, un-redacted text to ZeroGPU's hosted API** — detection runs server-side, so the PII reaches the third-party service *before* it is masked. This reduces what you forward downstream, not what reaches ZeroGPU. Don't submit regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Mask PII in-line. Run this with the `exec` tool, pasting the user's text into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m gliner-multi-pii-v1 --metadata '{"usecase":"redact","mask":"label"}' <<'ZGPU_END_OF_INPUT'
<the text to redact, verbatim>
ZGPU_END_OF_INPUT
```

Output is a JSON object: `redacted_text` is the original text with PII spans replaced by `[LABEL]` placeholders, and `entities` lists what was found. Lead with `redacted_text`. To extract (not mask) PII, use `extract-pii` instead.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
