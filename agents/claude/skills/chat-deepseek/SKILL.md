---
name: chat-deepseek
description: Chat with deepseek-v4-flash-0731, a 284B MoE model (13B active per token) with a 1M-token context window, tuned for coding and agentic workflows. Use for reading or writing code across a large codebase, porting and refactoring, or planning multi-step automation. Cheaper than chat-glm, with four times its context.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call deepseek-v4-flash-0731. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m deepseek-v4-flash-0731 <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.16 / \$0.38 per 1M input/output tokens this is the cheaper of the two 1M-context models on the platform — roughly a seventh of `/zerogpu-router:chat-glm` on input and a ninth on output. Prefer it whenever the task is code or tool-use rather than sheer input size. For a prompt that fits in 131K tokens, `/zerogpu-router:chat` costs about the same on input and over half again as much on output, so choose on task fit rather than price.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
