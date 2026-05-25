---
name: login
description: Sign in to ZeroGPU and persist the API key + Project ID. Use when the user asks to log in, authenticate, or set up ZeroGPU credentials for the first time.
argument-hint: "[--api-key <key>] [--project-id <id>]"
disable-model-invocation: true
allowed-tools: Bash(zerogpu login*)
---

Run the ZeroGPU login flow:

```bash
zerogpu login $ARGUMENTS
```

Notes:
- With no arguments, the CLI prompts interactively for the API key (masked) and Project ID.
- For non-interactive use (CI), pass `--api-key zgpu-api-…` and `--project-id <uuid>`.
- On success the credentials are written to the local config file and `ZEROGPU_API_KEY` is upserted into the user's shell profile.
