# Agent integrations

This folder holds **per-agent** packaging for ZeroGPU Router: routing skills and native plugins side by side.

| Agent | Folder | Overview |
|---|---|---|
| Claude Code | [claude/](claude/) | Marketplace plugin + skill-only `SKILL.md` |
| OpenClaw | [openclaw/](openclaw/) | Native plugin package + drop-in skill + MCP registration JSON |

Shared backend for all agents: [`../mcp-server/`](../mcp-server/) (MCP Worker / Node server).
