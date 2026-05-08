# Release Guide

This repository publishes one artifact: **`openclaw-package-zerogpu`** from `agents/openclaw/plugin/` — the OpenClaw plugin and routing skill.

The hosted MCP server at `https://mcp.zerogpu.ai/mcp` is operated by ZeroGPU and released separately.

## Pre-release Checklist

1. Confirm no real credentials are committed:

   ```bash
   rg -i "(api[-_ ]?key|project[-_ ]?id|secret|token)" .
   ```

2. Run the full local release check:

   ```bash
   npm run release:check
   ```

3. Bump `version` in `agents/openclaw/plugin/package.json` and `agents/openclaw/plugin/openclaw.plugin.json`.

4. Tag the release and create a GitHub release from the tag.

## NPM / ClawHub Dry Run

Use a dry run before publishing the OpenClaw plugin:

```bash
npm --prefix agents/openclaw/plugin pack --dry-run
```

Inspect the resulting tarball to confirm `dist/`, `skills/`, `openclaw.plugin.json`, and `README.md` are included.

## Publishing the OpenClaw plugin

Publish to ClawHub:

```bash
cd agents/openclaw/plugin
npm pack
openclaw plugins publish ./openclaw-package-zerogpu-<version>.tgz
```

After publishing, verify the listing at <https://clawhub.ai/plugins/openclaw-package-zerogpu> — the version, integrity hash, and file count should match the local tarball.

Smoke-test the install on a clean machine before announcing:

```bash
openclaw plugins install clawhub:openclaw-package-zerogpu
```
