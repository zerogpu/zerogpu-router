# Agent integrations

This folder holds **per-agent** packaging for ZeroGPU Router: routing skills and native plugins side by side.

| Agent | Folder | Overview |
|---|---|---|
| Claude Code | [claude/](claude/) | Marketplace plugin + skill-only `SKILL.md` |
| OpenClaw | [openclaw/](openclaw/) | Native plugin package + drop-in skill + MCP registration JSON |

All agents talk to the hosted ZeroGPU Router at `https://mcp.zerogpu.ai/mcp`. Manage API keys, projects, and dashboards at [platform.zerogpu.ai](https://platform.zerogpu.ai).
