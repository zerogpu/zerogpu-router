---
name: zerogpu-summarize
description: Summarize a plain-text passage you already have in hand — an email, transcript, meeting notes, article body, chat log — using ZeroGPU's llama-3.1-8b-instruct-fast edge model. Use when the user asks to summarize, condense, TL;DR, or give the gist of text that is already in the conversation or pasted into the prompt. Not for URLs, YouTube links, podcasts, PDFs, or local files — the bundled `summarize` skill handles those.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu summarize*)
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

Summarize a passage. `$ARGUMENTS` is the raw user text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu summarize "$ZGPU_TEXT"
```

Output is a short condensed summary string. The `zerogpu` CLI takes text only — it does not fetch URLs or read files. If the user specifically wants a local file summarized on ZeroGPU, they can run `zerogpu summarize "$(cat article.txt)"` themselves.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
