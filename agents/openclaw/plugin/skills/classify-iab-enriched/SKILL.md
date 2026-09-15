---
name: classify-iab-enriched
description: Enriched IAB classification — returns audience categories plus topics, keywords, and inferred intent. Use when the user wants richer ad/audience signals than plain IAB labels (e.g. "give me topics, keywords, and intent for this passage").
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

> **Sends your input to ZeroGPU's hosted API** for inference — this is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Run enriched IAB classification. Run this with the `exec` tool, pasting the source text into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m zlm-v2-iab-classify-edge-enriched <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

Output is a JSON object with `categories`, `topics`, `keywords`, and `intent`.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
