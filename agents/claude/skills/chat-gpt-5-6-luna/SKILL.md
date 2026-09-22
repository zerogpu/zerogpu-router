---
name: chat-gpt-5-6-luna
description: Chat with gpt-5.6-luna, the cost-optimized model of OpenAI's GPT-5.6 family, with a 272K-token context window, adjustable reasoning effort, function calling, and structured outputs. Use for cost-sensitive, high-volume coding, chat, reasoning, RAG, summarization, and translation work. Cheaper than chat-glm on input and output alike, over a slightly larger context.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call gpt-5.6-luna. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m gpt-5.6-luna <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.20 / \$1.20 per 1M input/output tokens this costs about a fifth of `/zerogpu-router:chat-glm` on input and a third on output, over a 272K-token window slightly larger than glm-5.2's 262K. For a prompt that fits in 131K tokens, `/zerogpu-router:chat` is cheaper on both.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
