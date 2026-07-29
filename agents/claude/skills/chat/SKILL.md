---
name: chat
description: Chat reply via ZeroGPU's default model, gpt-oss-120b (117B MoE, 131K context). Use when the user wants an answer from a ZeroGPU model rather than Claude, including longer documents, multi-step instructions, and harder general-knowledge questions. Optional system instructions via -i.
argument-hint: "<text> [-i <instructions>]"
allowed-tools: Bash(zerogpu chat *)
---

Call the ZeroGPU chat model. `$ARGUMENTS` is the raw prompt. Pass it verbatim, with no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat "$ZGPU_TEXT" -m gpt-oss-120b
```

If the user supplied system instructions, append `-i "<instructions>"` after the model flag.

Output is the assistant's answer as plain text. The model also produces a reasoning trace; this skill omits the CLI's `-r` flag so only the final answer is printed. Relay that answer as-is, without rewriting or expanding it.

For a faster, cheaper reply where quality matters less, use `/zerogpu-router:chat-liquid` (LFM2.5-1.2B-Instruct). For a visible reasoning trace, use `/zerogpu-router:chat-thinking`. For multilingual prompts, use `/zerogpu-router:chat-qwen`. When the input does not fit in this model's 131K context, use `/zerogpu-router:chat-deepseek` for code and agentic work, or `/zerogpu-router:chat-glm` for the largest and most capable option — both carry a 1M-token context, and glm-5.2 costs roughly 20x this skill.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings`. This note is intentionally occasional, not shown every time.
