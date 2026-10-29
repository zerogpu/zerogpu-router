---
name: decide-tools
description: Pick the right tool for a request and generate its arguments with zlm-v1-tool-decisions, a 0.6B model that combines MCP tool selection with query and argument generation in a single inference step, over a 24K-token context. It returns NO_TOOL when no tool is needed. Use for agent routing — deciding which tool to call and with what inputs — rather than for answering the request itself.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call zlm-v1-tool-decisions. `$ARGUMENTS` is the raw request — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m zlm-v1-tool-decisions <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

Output is the model's decision as plain text — the tool it selected and the inputs it generated, or `NO_TOOL` when the request needs none. Relay it as-is, and do not act on the decision unless the user asks you to.

At \$0.05 / \$0.15 per 1M input/output tokens this costs a third of `/zerogpu-router:chat` on input and a quarter on output, over a 24,576-token context — small enough to sit in front of every turn of an agent loop.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
