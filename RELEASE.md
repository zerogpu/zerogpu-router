# Release Guide

This repository publishes one artifact: **`zerogpu-router`** from `agents/openclaw/plugin/` — the OpenClaw plugin and routing skill.

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

Publishing uses the `clawhub` CLI (separate from `openclaw`). Install once:

```bash
npm i -g clawhub
clawhub login
clawhub whoami
```

Build, pack, and publish:

```bash
cd agents/openclaw/plugin
npm install
npm run build
npm pack
clawhub package publish ./zerogpu-router-<version>.tgz --family code-plugin --dry-run
clawhub package publish ./zerogpu-router-<version>.tgz --family code-plugin
```

After publishing, verify with:

```bash
clawhub package inspect zerogpu-router
```

…or open <https://clawhub.ai/plugins/zerogpu-router>.

Smoke-test the install on a clean OpenClaw / KiloClaw shell:

```bash
openclaw plugins install clawhub:zerogpu-router
```

To remove a broken or deprecated package (soft-delete all releases):

```bash
clawhub package delete <name>
```
