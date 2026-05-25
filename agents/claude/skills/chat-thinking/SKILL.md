---
name: chat-thinking
description: Chat with ZeroGPU's Thinking variant (LFM2.5-1.2B-Thinking), which returns visible reasoning alongside the answer. Use when the user wants the model's reasoning shown, or asks a short logic/math/word-problem question that benefits from step-by-step output.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_thinking*)
---

Call the ZeroGPU thinking model:

```!
zerogpu chat_thinking $ARGUMENTS
```

Pass the user's prompt as a single quoted string. The response includes the model's reasoning trace.
