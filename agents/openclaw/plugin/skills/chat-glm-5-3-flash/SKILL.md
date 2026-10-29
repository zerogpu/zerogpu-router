---
name: chat-glm-5-3-flash
description: Chat with glm-5.3-flash, Z.ai's efficient open-weight model for coding and long-horizon agent tasks, whose hybrid sparse and linear attention holds a 1M-token context window with function calling and adjustable reasoning effort. Use for repo-scale code work, long documents, and multi-step agent runs. It is the cheapest of the three 1M-context models on the platform, a third of chat-deepseek-v4-1-flash on input and under a third on output.
argument-hint: "<text> [-i <instructions>]"
allowed-tools: Bash(zerogpu chat_completions *)
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

Call glm-5.3-flash. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m glm-5.3-flash <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

At \$0.10 / \$0.35 per 1M input/output tokens this is the cheapest of the three 1M-context models on the platform — a third of `chat-deepseek-v4-1-flash` on input and under a third on output, and a quarter of `chat-gpt-4-1-mini` on input and under a quarter on output. Prefer it for coding and long-horizon agent work at repo scale; when the task wants DeepSeek's higher-effort reasoning, `chat-deepseek-v4-1-flash` is the pricier alternative.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
