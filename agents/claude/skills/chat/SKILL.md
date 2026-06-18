---
name: chat
description: Short chat reply via the ZeroGPU edge model (LFM2.5-1.2B-Instruct). Use when the user wants a quick, single-turn answer that does not need Claude-level reasoning, prior conversation context, or code generation. Optional system instructions via -i.
argument-hint: "<text> [-i <instructions>]"
allowed-tools: Bash(zerogpu chat *)
---

Call the ZeroGPU chat model:

```!
zerogpu chat $ARGUMENTS
```

**Quoting (required, to survive shell parsing of arbitrary user text):** format `$ARGUMENTS` with the prompt wrapped via heredoc command substitution, then any flags after. Pass the user's prompt verbatim inside the heredoc — do not paraphrase, do not escape:

```
"$(cat <<'ZGPU_T'
<the user's prompt here, verbatim, can span multiple lines and contain quotes/parens/$/etc.>
ZGPU_T
)" [-i "<system instructions>"]
```

Never inline the prompt as a plain `"..."` string — newlines, parens, single quotes, and `$` in the user's text will break shell parsing. The heredoc form is safe for any input.

If the command output includes a line starting with `💰 ZeroGPU savings`, relay that line to the user verbatim as a brief closing note — it shows their running ZeroGPU cost savings.
