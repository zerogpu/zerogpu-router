# Claude Code Integration

This folder contains both plugin and skill options for Claude Code.

## Plugin option

- Marketplace file: `.claude-plugin/marketplace.json`
- Plugin package: `plugins/zerogpu/.claude-plugin/plugin.json`

Install from your local clone:

```text
/plugin marketplace add <path-to-repo>/agents/claude
/plugin install zerogpu@zerogpu-local
```

## Skill option

- Skill file: `plugins/zerogpu/skill/SKILL.md`

Use this directly if you only want routing guidance text.
