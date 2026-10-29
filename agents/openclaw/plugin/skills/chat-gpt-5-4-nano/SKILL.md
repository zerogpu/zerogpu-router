---
name: chat-gpt-5-4-nano
description: Chat with gpt-5.4-nano, the most cost-efficient model in OpenAI's GPT-5.4 family, built for high-volume and latency-sensitive workloads such as classification, extraction, routing, and sub-agent tasks, with function calling, structured outputs, and a 400K-token context window. Use when throughput and latency matter more than depth. Matches chat-gpt-5-6-luna on input price over a larger context.
argument-hint: "<text> [-i <instructions>]"
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

Call gpt-5.4-nano. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m gpt-5.4-nano <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

At \$0.20 / \$1.25 per 1M input/output tokens this matches `chat-gpt-5-6-luna` on input and costs marginally more on output, over a 400K-token window rather than 272K. It is twice `chat-gpt-6-luna` on input and two and a half times on output. For a prompt that fits in 131K tokens, `chat` is cheaper on both.

Output is the assistant's answer as plain text. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
