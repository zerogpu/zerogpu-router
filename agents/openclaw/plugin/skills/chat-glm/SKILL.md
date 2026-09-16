---
name: chat-glm
description: Chat with glm-5.2, a 753B MoE flagship with a 262K-token context window. Use when the input is too large for `chat` — an entire repository, a book-length document, a long agent transcript — or for long-horizon reasoning the smaller models cannot hold together. This is the most expensive model on the platform, roughly 7x the cost of `chat`, so prefer chat for anything that fits in its 131K context.
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

Call glm-5.2. Run this with the `exec` tool, pasting the user's prompt into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m glm-5.2 <<'ZGPU_END_OF_INPUT'
<the user's prompt, verbatim>
ZGPU_END_OF_INPUT
```

If the user supplied system instructions, add `-i '<instructions>'` after the model flag, writing any `'` inside them as `'\''`.

Reach for this only when the size or horizon of the task actually needs it. At \$1.10 / \$3.50 per 1M input/output tokens, glm-5.2 costs about seven times `chat` on input and six times on output (`gpt-oss-120b`, \$0.15 / \$0.60), and over fifty times the 1.2B edge models. For a prompt that fits in 131K tokens, `chat` is the right call. For coding and agentic work, `chat-deepseek` is far cheaper and carries a larger 1M-token context.

Output is the assistant's answer as plain text — the model's reasoning trace comes back in a separate field and is not printed. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
