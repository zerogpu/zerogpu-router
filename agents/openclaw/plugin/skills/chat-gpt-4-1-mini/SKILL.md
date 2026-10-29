---
name: chat-gpt-4-1-mini
description: Chat with gpt-4.1-mini, OpenAI's fast, cost-efficient GPT-4.1 model, strong at instruction following and tool calling across a 1M-token context window at low latency, with function calling and structured outputs. Use for coding, chat, reasoning, RAG, summarization, and translation over very large inputs where instruction fidelity and tool calling matter more than price. It is the priciest of the three 1M-context models, and the most expensive model on the platform.
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

Call gpt-4.1-mini. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m gpt-4.1-mini <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

At \$0.40 / \$1.60 per 1M input/output tokens this is the priciest of the three 1M-context models on the platform — four times `chat-glm-5-3-flash` on input and over four times on output, and a third again as much as `chat-deepseek-v4-1-flash` on both. It is the most expensive model on the platform, roughly 2.7x `chat` on input and output alike and twenty times the 1.2B edge models on input. Prefer it when instruction following and tool calling matter more than price.

Output is the assistant's answer as plain text. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
