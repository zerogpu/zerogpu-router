---
name: chat-thinking
description: Chat with ZeroGPU's Thinking variant (LFM2.5-1.2B-Thinking), which returns visible reasoning alongside the answer. Use when the user wants the model's reasoning shown, or asks a short logic/math/word-problem question that benefits from step-by-step output.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call the ZeroGPU thinking model. `$ARGUMENTS` is the raw user prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m LFM2.5-1.2B-Thinking --raw <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

Output is the full Chat Completions response as JSON, because the reasoning is a separate field there. Show the model's reasoning first — `choices[0].message.reasoning`, or `reasoning_content` if that is the field present — then its answer from `choices[0].message.content`. If there is no separate reasoning field, the content carries the reasoning inline; show it as-is. Do not print the rest of the JSON.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
