---
name: chat-deepseek
description: Chat with deepseek-v4-flash, a 284B MoE model (13B active per token) with a 1M-token context window, tuned for coding and agentic workflows. Use for reading or writing code across a large codebase, porting and refactoring, or planning multi-step automation. Cheaper than chat-glm at the same context size.
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

Call deepseek-v4-flash. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat "$ZGPU_TEXT" -m deepseek-v4-flash
```

If the user supplied system instructions, append `-i "<instructions>"` after the model flag.

At \$0.07 / \$0.14 per 1M input/output tokens this is the cheaper of the two 1M-context models — roughly a sixteenth of `chat-glm`. Prefer it whenever the task is code or tool-use rather than sheer input size. For a prompt that fits in 131K tokens, `chat` is cheaper still.

This model is served by the Chat Completions API rather than the Responses API; the CLI routes it automatically. Output is the assistant's answer as plain text — the model's reasoning trace is omitted, since this skill does not pass the CLI's `-r` flag. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
