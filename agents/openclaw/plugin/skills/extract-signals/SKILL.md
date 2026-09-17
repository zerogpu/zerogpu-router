---
name: extract-signals
description: Turn free text into structured signals — topics, keywords, intent, and other contextual attributes — in a single call (zlm-v1-signal-extract, 80M). Use for content enrichment, contextual intelligence, ad targeting, agent routing, recommendation, and analytics pipelines, where a general-purpose LLM would be overkill. For IAB taxonomy categories alongside these signals, use classify-iab-enriched.
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

Run signal extraction. Run this with the `exec` tool, pasting the source text into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m zlm-v1-signal-extract <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

Output is a structured JSON object of the signals the model found — topics, keywords, intent, and other contextual attributes.

At 80M parameters and \$0.02 / \$0.05 per 1M input/output tokens this is built for high-volume enrichment. Its context window is 400 tokens, so send the passage you want enriched rather than a whole document. If you need IAB audience and content categories too, `classify-iab-enriched` returns those alongside topics, keywords, and intent.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
