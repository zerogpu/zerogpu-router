---
name: status
description: Show current ZeroGPU sign-in status and the masked API key. Use when the user asks whether they are logged in, who they are signed in as, or to verify credentials.
disable-model-invocation: true
allowed-tools: Bash(zerogpu status)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

Check the sign-in status:

```!
zerogpu status
```

Exit code is `0` when signed in, `1` when not. If not signed in, suggest signing in with the `signin` skill (`zerogpu login`).
