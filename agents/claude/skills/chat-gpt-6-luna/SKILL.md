---
name: chat-gpt-6-luna
description: Chat with gpt-6-luna, the most efficient model of OpenAI's GPT-6 family, which reads text and images across a 272K-token context window with adjustable reasoning effort, function calling, and structured outputs. Use for high-volume, cost-sensitive coding, chat, reasoning, RAG, summarization, and translation work. Half the price of chat-gpt-5-6-luna on input over the same context.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call gpt-6-luna. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m gpt-6-luna <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.10 / \$0.50 per 1M input/output tokens this costs half `/zerogpu-router:chat-gpt-5-6-luna` on input and under half on output, over the same 272K-token window, and two thirds of `/zerogpu-router:chat` on input for a window twice as large. Prefer it over `chat-gpt-5-6-luna` unless the task specifically wants GPT-5.6's behaviour.

Output is the assistant's answer as plain text. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
