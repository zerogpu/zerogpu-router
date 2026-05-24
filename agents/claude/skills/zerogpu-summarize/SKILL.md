---
name: zerogpu-summarize
description: Summarize a passage using ZeroGPU's t5-small edge model. Use when the user asks to summarize, condense, TL;DR, or give the gist of an article, email, transcript, or other plain-text passage.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu summarize*)
---

Summarize text:

```!
zerogpu summarize $ARGUMENTS
```

Pass the source text as a single quoted positional argument. For files, the user can run `zerogpu summarize "$(cat article.txt)"` directly.
