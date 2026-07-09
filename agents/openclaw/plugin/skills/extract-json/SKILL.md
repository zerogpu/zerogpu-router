---
name: extract-json
description: Schema-driven structured JSON extraction via ZeroGPU. Use when the user wants to pull specific named fields out of free text into a JSON object — contact info, invoice details, order data, profile attributes — defined by a per-field type/description schema.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu extract_json *)
---

Run structured JSON extraction:

```!
zerogpu extract_json $ARGUMENTS
```

**Quoting (required, to survive shell parsing of arbitrary user text):** format `$ARGUMENTS` with the source text wrapped via heredoc command substitution, then flags after. Inside the heredoc, paste the user's text verbatim — do not escape:

```
"$(cat <<'ZGPU_T'
<the source text, verbatim, multi-line and special chars all OK>
ZGPU_T
)" -s '{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}'
```

Schema is required, single-quoted JSON. Each field is `name::type::description`. Output is a JSON object keyed by group, with extracted field values.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings.
