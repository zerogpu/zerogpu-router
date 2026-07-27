---
name: chat-gpt-oss
description: Chat with gpt-oss-120b, ZeroGPU's largest open-weight model (117B MoE, 131K context). Use when a task needs more capability than the 1.2B edge models can give — longer documents, multi-step instructions, harder general-knowledge questions — but still does not warrant Claude.
argument-hint: "<text> [-i <instructions>]"
allowed-tools: Bash(zerogpu chat *)
---

Call gpt-oss-120b. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat "$ZGPU_TEXT" -m gpt-oss-120b
```

If the user supplied system instructions, append `-i "<instructions>"` after the model flag.

Output is the assistant's answer as plain text. The model also produces a reasoning trace; this skill omits the CLI's `-r` flag so only the final answer is printed. Relay that answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
