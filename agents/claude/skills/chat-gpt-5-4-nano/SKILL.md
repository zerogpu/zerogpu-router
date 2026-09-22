---
name: chat-gpt-5-4-nano
description: Chat with gpt-5.4-nano, the most cost-efficient model in OpenAI's GPT-5.4 family, built for high-volume and latency-sensitive workloads such as classification, extraction, routing, and sub-agent tasks, with function calling, structured outputs, and a 400K-token context window. Use when throughput and latency matter more than depth. Matches chat-gpt-5-6-luna on input price over a larger context.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call gpt-5.4-nano. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m gpt-5.4-nano <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.20 / \$1.25 per 1M input/output tokens this matches `/zerogpu-router:chat-gpt-5-6-luna` on input and costs marginally more on output, over a 400K-token window rather than 272K. It is about a fifth of `/zerogpu-router:chat-glm` on input and a third on output. For a prompt that fits in 131K tokens, `/zerogpu-router:chat` is cheaper on both.

Output is the assistant's answer as plain text. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
