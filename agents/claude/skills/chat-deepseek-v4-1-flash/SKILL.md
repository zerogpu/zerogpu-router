---
name: chat-deepseek-v4-1-flash
description: Chat with deepseek-v4.1-flash, a sparse MoE model on DeepSeek's Causal Encoder-Decoder architecture (8B active on input, 16B on output) with a 1M-token context window. Use for large codebases, long documents, extended conversations, and multi-step agent tasks that want higher-effort reasoning or function calling. Costs about twice chat-deepseek on input and three times on output.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call deepseek-v4.1-flash. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m deepseek-v4.1-flash <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.30 / \$1.20 per 1M input/output tokens this is the pricier of the two 1M-context models on the platform — roughly twice `/zerogpu-router:chat-deepseek` on input and three times on output, and about a quarter of `/zerogpu-router:chat-glm` on input and a third on output. Prefer it when the task wants V4.1's higher-effort reasoning or function calling; for ordinary coding and agentic work at the same context size, `chat-deepseek` is cheaper.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
