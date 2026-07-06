---
name: zerogpu_health
description: Verify the ZeroGPU backend is reachable. Use before a batch of calls, or when a previous ZeroGPU call failed and you need to confirm whether the backend is up.
allowed-tools: Bash(zerogpu health)
---

Check backend health:

```!
zerogpu health
```

Exit code is `0` when the backend is reachable, non-zero otherwise. If the check fails, fall back to answering with the host model and tell the user the offload path was unavailable.
