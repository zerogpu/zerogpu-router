---
name: chat-deepseek-v4-1-flash
description: Chat with deepseek-v4.1-flash, a sparse MoE model on DeepSeek's Causal Encoder-Decoder architecture (8B active on input, 16B on output) with a 1M-token context window. Use for large codebases, long documents, extended conversations, and multi-step agent tasks that want higher-effort reasoning or function calling. Costs about twice chat-deepseek on input and three times on output.
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

Call deepseek-v4.1-flash. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m deepseek-v4.1-flash <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

At \$0.30 / \$1.20 per 1M input/output tokens this is the pricier of the two 1M-context models on the platform — roughly twice `chat-deepseek` on input and three times on output, and about a quarter of `chat-glm` on input and a third on output. Prefer it when the task wants V4.1's higher-effort reasoning or function calling; for ordinary coding and agentic work at the same context size, `chat-deepseek` is cheaper.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
