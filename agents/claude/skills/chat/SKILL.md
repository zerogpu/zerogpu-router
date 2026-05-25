---
name: chat
description: Short chat reply via the ZeroGPU edge model (LFM2.5-1.2B-Instruct). Use when the user wants a quick, single-turn answer that does not need Claude-level reasoning, prior conversation context, or code generation. Optional system instructions via -i.
argument-hint: "<text> [-i <instructions>]"
allowed-tools: Bash(zerogpu chat*)
---

Call the ZeroGPU chat model:

```!
zerogpu chat $ARGUMENTS
```

Argument shape: a single quoted prompt string, optionally followed by `-i "<system instructions>"`. Pass the user's prompt verbatim — do not paraphrase.
