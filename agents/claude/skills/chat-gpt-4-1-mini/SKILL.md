---
name: chat-gpt-4-1-mini
description: Chat with gpt-4.1-mini, OpenAI's fast, cost-efficient GPT-4.1 model, strong at instruction following and tool calling across a 1M-token context window at low latency, with function calling and structured outputs. Use for coding, chat, reasoning, RAG, summarization, and translation over very large inputs where instruction fidelity and tool calling matter more than price. It is the priciest of the three 1M-context models on the platform.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call gpt-4.1-mini. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m gpt-4.1-mini <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.40 / \$1.60 per 1M input/output tokens this is the priciest of the three 1M-context models on the platform — four times `/zerogpu-router:chat-glm-5-3-flash` on input and over four times on output, and roughly three times `/zerogpu-router:chat-deepseek-v4-1-flash` on both. It is still about a third of `/zerogpu-router:chat-glm` on input and under half on output, with four times its context. Prefer it when instruction following and tool calling matter more than price.

Output is the assistant's answer as plain text. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
