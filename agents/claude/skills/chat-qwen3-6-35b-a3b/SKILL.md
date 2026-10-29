---
name: chat-qwen3-6-35b-a3b
description: Chat with qwen3.6-35b-a3b, a 35B open-weight Mixture-of-Experts multimodal model that understands text, images, and video, with structured output and tool calling over a 16K-token context. Use for visual question answering, document and screenshot analysis, video understanding, content extraction, and agent workflows. For plain multilingual text use chat-qwen — it is half the price on input and holds twice the context.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call qwen3.6-35b-a3b. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m qwen3.6-35b-a3b <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

At \$0.20 / \$1.50 per 1M input/output tokens this costs twice `/zerogpu-router:chat-qwen` on input and over three times on output, over half its context, so reach for it when the task actually involves images or video. Its 16,384-token window is the smallest of the chat models, so send the page or passage you want analysed rather than a whole corpus.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
