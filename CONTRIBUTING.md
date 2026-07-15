# Contributing

Thanks for helping improve ZeroGPU Router.

This repository hosts **OpenClaw-first** agent integrations: the **`zerogpu-openclaw-plugin`** package (same string for npm and plugin `id` in `openclaw.plugin.json` / `src/index.ts`) and its CLI-based skills under `agents/openclaw/`. Optional Claude Code assets live under `agents/claude/`. Releases go to **npm** and/or **git** — see [OPENCLAW_RELEASE.md](OPENCLAW_RELEASE.md) (Claude Code plugin releases: [agents/claude/RELEASE.md](agents/claude/RELEASE.md)).

## Development Setup

Use Node.js 22 or newer.

```bash
npm install --prefix agents/openclaw/plugin
```

Run the main checks before opening a pull request:

```bash
npm run release:check
```

Or build the OpenClaw plugin directly:

```bash
npm --prefix agents/openclaw/plugin run build
```

## Repository Layout

- `agents/openclaw/` — **main workstream:** OpenClaw package `zerogpu-openclaw-plugin` + CLI-based skills.
- `agents/claude/` — optional Claude Code marketplace plugin + routing skill.
- Routing rules live in `agents/openclaw/plugin/skills/zerogpu/SKILL.md` (OpenClaw). If you also change Claude behavior, keep `agents/claude/plugins/zerogpu/skill/SKILL.md` aligned when practical.

## Pull Request Guidelines

- Keep runtime behavior changes and documentation changes clearly separated when possible.
- When changing routing rules, start from `agents/openclaw/plugin/skills/zerogpu/SKILL.md`. Update the Claude skill copy only if you care about parity for `agents/claude/`.
- Do not commit generated build output, `.env` files, or real API credentials.
- If you change the OpenClaw plugin's manifest or skill, bump the version in `agents/openclaw/plugin/package.json` and `agents/openclaw/plugin/openclaw.plugin.json`.

## Testing changes end-to-end

To smoke-test a routing change locally:

1. Get an API key and project ID at [platform.zerogpu.ai](https://platform.zerogpu.ai).
2. Install and authenticate the `zerogpu` CLI (`npm install -g zerogpu-cli && zerogpu login`).
3. Install the plugin from this branch (`cd agents/openclaw/plugin && openclaw plugins install ./`).
4. Run a few prompts and confirm the agent runs the expected `zerogpu` CLI command.
