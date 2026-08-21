---
name: chat-glm
description: Chat with glm-5.2, a 753B MoE flagship with a 1M-token context window. Use when the input is too large for the other chat skills — an entire repository, a book-length document, a long agent transcript — or for long-horizon reasoning the smaller models cannot hold together. This is the most expensive model on the platform, roughly 7x the cost of `chat`, so prefer chat for anything that fits in its 131K context.
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

Call glm-5.2. `$ARGUMENTS` is the raw prompt — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat "$ZGPU_TEXT" -m glm-5.2
```

If the user supplied system instructions, append `-i "<instructions>"` after the model flag.

Reach for this only when the size or horizon of the task actually needs it. At \$1.10 / \$3.50 per 1M input/output tokens, glm-5.2 costs about seven times `chat` on input and six times on output (`gpt-oss-120b`, \$0.15 / \$0.60), and over fifty times the 1.2B edge models. For a prompt that fits in 131K tokens, `chat` is the right call. For coding and agentic work at the same 1M context, `chat-deepseek` is far cheaper.

This model is served by the Chat Completions API rather than the Responses API; the CLI routes it automatically. Output is the assistant's answer as plain text — the model's reasoning trace is omitted, since this skill does not pass the CLI's `-r` flag. Relay the answer as-is — do not rewrite or expand it.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
