---
name: embed
description: Turn text into a 384-dimensional embedding vector for semantic search, RAG retrieval, clustering, deduplication, or similarity comparison. Use when the user asks to embed text, build or query a vector index, or compare passages by meaning rather than by keyword.
argument-hint: "<text> [-m <model>]"
allowed-tools: Bash(zerogpu embeddings *)
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

Embed the text. Run this with the `exec` tool, pasting the text into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu embeddings -m all-minilm-l6-v2 <<'ZGPU_END_OF_INPUT'
<the text to embed, verbatim>
ZGPU_END_OF_INPUT
```

Defaults to `all-minilm-l6-v2` (22.7M parameters, 512-token window), the general-purpose choice for semantic similarity over short chunks. Use `-m bge-small-en-v1.5` instead (33M parameters, 512-token window) when the user asks for it, for English retrieval, or when retrieval quality is the bottleneck. Both cost \$0.004 per 1M input tokens and bill nothing on output, and both return 384-dimensional vectors, so they are interchangeable in an existing index.

Output is OpenAI's embeddings envelope as JSON: `data[].embedding` holds the vector, `data[].index` maps it back to its input, and `usage` reports input tokens. Do not print the raw vector back to the user — it is 384 floats and unreadable. Say what was embedded, which model produced it, and how many dimensions came back. Print or write the numbers only if the user explicitly asks for the vector or is piping it somewhere.

These models are served only by the Embeddings API, so this skill calls them there rather than through Chat Completions. Inputs longer than the model's window are truncated, so chunk long documents and embed the chunks.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
