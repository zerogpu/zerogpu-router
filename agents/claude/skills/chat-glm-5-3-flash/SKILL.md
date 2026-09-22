---
name: chat-glm-5-3-flash
description: Chat with glm-5.3-flash, Z.ai's efficient open-weight model for coding and long-horizon agent tasks, whose hybrid sparse and linear attention holds a 1M-token context window with function calling and adjustable reasoning effort. Use for repo-scale code work, long documents, and multi-step agent runs. It is the cheapest of the three 1M-context models on the platform, about an eleventh of chat-glm on input and a tenth on output.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call glm-5.3-flash. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m glm-5.3-flash <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.10 / \$0.35 per 1M input/output tokens this is the cheapest of the three 1M-context models on the platform — about an eleventh of `/zerogpu-router:chat-glm` on input and a tenth on output, and roughly two thirds of `/zerogpu-router:chat-deepseek-v4-1-flash` on both. Prefer it for coding and long-horizon agent work at repo scale; when the task wants DeepSeek's higher-effort reasoning, `chat-deepseek-v4-1-flash` is the pricier alternative.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
