---
name: cost-savings
description: Show how much you've saved by routing tasks to ZeroGPU instead of your frontier model — a rounded dollar estimate and the frontier-model tokens offloaded. Use when the user asks how much they've saved, their ZeroGPU savings, or to see the cost-savings summary.
disable-model-invocation: true
allowed-tools: Bash(zerogpu cost_savings*)
---

Show the ZeroGPU cost-savings summary:

```!
zerogpu cost_savings
```

Relay the report to the user as-is. Token counts are actual (from the API); the dollar figure is a rounded estimate of what the same work would have cost on your frontier model (default baseline `claude-opus-4-8`, overridable via the `ZEROGPU_SAVINGS_MODEL` env var). Pass `--json` for raw data or `--reset` to clear the history.
