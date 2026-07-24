---
name: chat
description: Short chat reply via the ZeroGPU edge model (LFM2.5-1.2B-Instruct). Use when the user wants a quick, single-turn answer that does not need host-level reasoning, prior conversation context, or code generation. Optional system instructions via -i.
argument-hint: "<text> [-i <instructions>]"
allowed-tools: Bash(zerogpu chat *)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **Sends your input to ZeroGPU's hosted API** for inference — this is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

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

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
