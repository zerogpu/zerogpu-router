---
name: extract-json
description: Schema-driven structured JSON extraction (gliner2-base-v1). Use when the user wants to pull specific named fields out of free text into a JSON object — contact info, invoice details, order data, profile attributes — defined by a per-field type/description schema.
argument-hint: "<text> -s '<json schema>'"
allowed-tools: Bash(zerogpu extract_json*)
---

Run structured JSON extraction:

```!
zerogpu extract_json $ARGUMENTS
```

Schema shape (required, single-quoted JSON). Each field is `name::type::description`:

```
{"contact":["name::str::Full name","email::str::Email address","phone::str::Phone number"]}
```

Output is a JSON object keyed by group, with extracted field values.
