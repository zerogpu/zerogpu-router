# Claude Code

ZeroGPU routing for Claude Code ships in two complementary forms: a **skill** (routing guidance) and a **marketplace plugin** manifest that loads that skill. You still register the hosted MCP endpoint separately (`claude mcp add`), as in the [root README](../../README.md#quick-start).

## Plugin (recommended)

Install from this repo via Claude’s plugin marketplace UI.

- Marketplace root: **`agents/claude/`** — contains [`./.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json)
- Packaged plugin: [`./plugins/zerogpu/`](./plugins/zerogpu/) — [`plugin.json`](./plugins/zerogpu/.claude-plugin/plugin.json) lists the skill path

After cloning the repository, add the marketplace (adjust the path to your clone):

```text
/plugin marketplace add <path-to-repo>/agents/claude
```

Then install the plugin (name matches `marketplace.json`):

```text
/plugin install zerogpu@zerogpu-local
```

## Skill only

If you only want the routing text without the plugin wrapper, use:

- [`plugins/zerogpu/skill/SKILL.md`](./plugins/zerogpu/skill/SKILL.md)

You still need the `zerogpu` MCP server registered in Claude Code so the `zerogpu_*` tools exist.

## See also

- [OpenClaw equivalent](../openclaw/README.md)
