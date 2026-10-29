---
name: extract-entities-multi
description: Custom-label named-entity recognition across multiple languages (gliner2.5-multi-v1, 287M). Use when the user wants to extract entities with their own labels — people, organizations, locations, attributes, or any caller-defined entity type — from a passage that is not in English. Use extract-entities for English text; the two cost the same.
argument-hint: "<text> (-l <label>... | --labels a,b,c) [-t <0..1>]"
allowed-tools: Bash(zerogpu chat_completions *)
---

Run multilingual custom-label NER. The request below holds the source text and the entity labels, given as flags (`-l person -l company`, `--labels person,company`, `-t 0.4`) or in plain words.

Run this with the Bash tool, filling in the labels and pasting the source text into the heredoc verbatim — no escaping, the quoted heredoc handles every shell metacharacter, newline, quote, and paren:

```bash
zerogpu chat_completions -m gliner2.5-multi-v1 --metadata '{"usecase":"ner","labels":["person","company"],"threshold":0.3}' <<'ZGPU_END_OF_INPUT'
<the source text, verbatim>
ZGPU_END_OF_INPUT
```

- `"usecase":"ner"` is required exactly as written; the API rejects the request without it.
- `labels` needs at least one label. If the request names none, ask the user which entity types to extract.
- `threshold` is the minimum confidence in `[0, 1]`. Use `0.3` unless the request gives one.
- `--metadata` is single-quoted JSON, so write any `'` inside a label as `'\''`.

Output is a JSON object whose `entities` maps each label to the spans found.

At \$0.02 / \$0.05 per 1M input/output tokens this matches `/zerogpu-router:extract-entities` exactly, so the choice is about language, not cost: this model is built on mDeBERTa-v3-base for multilingual text, where `extract-entities` is English-only. It also supports `"usecase":"json"` and `"usecase":"classification"`, the shapes `/zerogpu-router:extract-json` and `/zerogpu-router:classify-structured` use.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.

Request: $ARGUMENTS
