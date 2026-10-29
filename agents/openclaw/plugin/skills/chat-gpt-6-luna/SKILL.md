---
name: chat-gpt-6-luna
description: Chat with gpt-6-luna, the most efficient model of OpenAI's GPT-6 family, built for high-volume, cost-sensitive work, with a 272K-token context window, adjustable reasoning effort, function calling, and structured outputs. Use for high-volume, cost-sensitive coding, chat, reasoning, RAG, summarization, and translation work. Half the price of chat-gpt-5-6-luna on input over the same context.
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

Call gpt-6-luna. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m gpt-6-luna <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

At \$0.10 / \$0.50 per 1M input/output tokens this costs half `chat-gpt-5-6-luna` on input and under half on output, over the same 272K-token window, and two thirds of `chat` on input for a window twice as large. Prefer it over `chat-gpt-5-6-luna` unless the task specifically wants GPT-5.6's behaviour.

Output is the assistant's answer as plain text. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
