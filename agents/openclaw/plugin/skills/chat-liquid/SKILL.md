---
name: chat-liquid
description: Fastest, cheapest chat reply via Liquid AI's edge model (LFM2.5-1.2B-Instruct). Use when the user wants a quick, single-turn answer that does not need host-level reasoning, prior conversation context, or code generation, and explicitly favors speed or cost over quality. Optional system instructions via -i.
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

> **Sends your input to ZeroGPU's hosted API** for inference. This is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Call the Liquid AI edge model. `$ARGUMENTS` is the raw prompt. Pass it verbatim, with no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu chat "$ZGPU_TEXT" -m LFM2.5-1.2B-Instruct
```

If the user supplied system instructions, append `-i "<instructions>"` after the model flag.

Output is the assistant's answer as plain text. Relay it as-is, without rewriting or expanding it. At 1.2B parameters this model is terse and occasionally mechanical; that is expected. If the answer is too weak for the task, the `chat` skill runs the same prompt on `gpt-oss-120b`.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill. This note is intentionally occasional, not shown every time.
