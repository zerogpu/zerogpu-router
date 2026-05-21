# Changelog

## 0.1.0

Initial Claude Code plugin release.

- Adds the `zerogpu-router` model-invoked skill that offloads classification (IAB, zero-shot, structured), summarization, entity and JSON extraction, PII redaction and extraction, follow-up generation, and small-model chat to the ZeroGPU MCP backend.
- Skill detects HTTP 420 from the backend as a billing-state error and points the user to https://platform.zerogpu.ai.
- Ships under `agents/claude/` alongside the existing OpenClaw plugin in the same monorepo.
- Installable via `/plugin marketplace add github.com/zerogpu/zerogpu-router` then `/plugin install zerogpu-router@zerogpu-router`.
