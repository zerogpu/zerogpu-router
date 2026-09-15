---
name: classify-iab
description: Classify text against the IAB content/audience taxonomy. Use when the user asks for IAB categories, ad-taxonomy labels, or "what topic is this article about" against a standard taxonomy.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Run IAB classification. `$ARGUMENTS` is the raw source text — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m zlm-v1-iab-classify-edge <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

Output is a JSON object with `audience` and `content` (`iab_1_0` and `iab_2_2`) category lists, each with confidence scores.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
