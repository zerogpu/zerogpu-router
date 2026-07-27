---
name: chat-qwen
description: Chat with qwen3-30b-a3b-fp8, a 30.5B MoE model with strong multilingual coverage (100+ languages, 32K context). Use for non-English prompts, translation-adjacent tasks, or mid-weight questions the 1.2B edge models handle poorly.
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

Call qwen3-30b-a3b-fp8. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat "$ZGPU_TEXT" -m qwen3-30b-a3b-fp8
```

If the user supplied system instructions, append `-i "<instructions>"` after the model flag.

This model is served by the Chat Completions API rather than the Responses API; the CLI routes it automatically. Output is the assistant's answer as plain text — the model's reasoning trace is omitted, since this skill does not pass the CLI's `-r` flag. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
