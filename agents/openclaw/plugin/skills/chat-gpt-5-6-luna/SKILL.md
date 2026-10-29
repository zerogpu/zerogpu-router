---
name: chat-gpt-5-6-luna
description: Chat with gpt-5.6-luna, the cost-optimized model of OpenAI's GPT-5.6 family, with a 272K-token context window, adjustable reasoning effort, function calling, and structured outputs. Use for cost-sensitive, high-volume coding, chat, reasoning, RAG, summarization, and translation work. Costs twice chat-gpt-6-luna on input and over twice on output, over the same 272K window.
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

Call gpt-5.6-luna. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m gpt-5.6-luna <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

At \$0.20 / \$1.20 per 1M input/output tokens this costs twice `chat-gpt-6-luna` on input and over twice on output, over the same 272K-token window, and a third more than `chat` on input with twice its output price. For a prompt that fits in 131K tokens, `chat` is cheaper on both.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
