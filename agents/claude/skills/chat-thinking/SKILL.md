---
name: chat-thinking
description: Chat with ZeroGPU's Thinking variant (LFM2.5-1.2B-Thinking), which returns visible reasoning alongside the answer. Use when the user wants the model's reasoning shown, or asks a short logic/math/word-problem question that benefits from step-by-step output.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_thinking*)
---

Call the ZeroGPU thinking model. `$ARGUMENTS` is the raw user prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat_thinking "$ZGPU_TEXT"
```

The response includes the model's reasoning trace.
