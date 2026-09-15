---
name: cost-savings
description: Show how much you've saved by routing tasks to ZeroGPU instead of the host model — cumulative dollars and tokens offloaded. Use when the user asks how much they've saved, their ZeroGPU savings, or to see the cost-savings summary.
disable-model-invocation: true
allowed-tools: Bash(zerogpu cost_savings*)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

Show the ZeroGPU cost-savings summary with the `exec` tool:

```bash
zerogpu cost_savings
```

Relay the report to the user as-is. Token counts are actual (from the API); dollar figures are an estimate of what the same work would have cost on the host model (default baseline `claude-opus-4-8`, overridable via the `ZEROGPU_SAVINGS_MODEL` env var). Add `--json` when the user wants the raw data, or `--reset` only when they explicitly ask to clear the history.
