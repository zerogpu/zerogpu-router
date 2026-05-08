# ZeroGPU Claude Plugin

This public repository now contains only the Claude Code plugin + skill artifacts.

## What is included

- `agents/claude/.claude-plugin/marketplace.json` — local marketplace definition.
- `agents/claude/plugins/zerogpu/.claude-plugin/plugin.json` — plugin manifest.
- `agents/claude/plugins/zerogpu/skill/SKILL.md` — routing guidance used by Claude.

## Install in Claude Code

1. Add this repository as a local marketplace:

```text
/plugin marketplace add <path-to-repo>/agents/claude
```

2. Install the plugin:

```text
/plugin install zerogpu@zerogpu-local
```

## Skill-only usage

If you only need the guidance text, use:

- `agents/claude/plugins/zerogpu/skill/SKILL.md`

## Notes

- MCP server/worker and deployment code is intentionally not included here.
- Security contact: `hello@zerogpu.ai`.
