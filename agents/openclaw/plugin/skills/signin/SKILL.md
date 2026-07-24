---
name: signin
description: Sign in to ZeroGPU and persist the API key. Use when the user asks to log in, authenticate, or set up ZeroGPU credentials for the first time.
argument-hint: "[--api-key <key>]"
disable-model-invocation: true
allowed-tools: Bash(zerogpu login*)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **This is a credential setup with persistent side effects.** On success it writes your API key to a local config file **and upserts `ZEROGPU_API_KEY` into your shell profile** (e.g. `~/.zshrc` / `~/.bashrc`) — a lasting change to your environment, not a session-only login. Only run it when you intend to store a ZeroGPU credential on this machine. Revoke keys from the [dashboard](https://platform.zerogpu.ai).

Run the ZeroGPU login flow:

```!
zerogpu login $ARGUMENTS
```

Notes:
- With no arguments, the CLI prompts interactively for the API key (masked).
- For non-interactive use (CI), pass `--api-key zgpu-api-…`. Avoid passing the key as a literal argument on shared machines, where it may land in shell history or process listings.
- On success the credentials are written to the local config file and `ZEROGPU_API_KEY` is upserted into the user's shell profile.
