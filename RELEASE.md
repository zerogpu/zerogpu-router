# Release Guide

This repository publishes one artifact: **`zerogpu-openclaw-plugin`** from `agents/openclaw/plugin/` — the OpenClaw plugin and routing skill. The **npm package name** and the plugin **`id`** in `openclaw.plugin.json` / `src/index.ts` are both `zerogpu-openclaw-plugin`.

The hosted MCP server at `https://mcp.zerogpu.ai/mcp` is operated by ZeroGPU and released separately.

**Distribution:** use the **public npm registry** and/or **install from this GitHub repo**. ClawHub is not part of this project’s release path.

## Pre-release checklist

1. Confirm no real credentials are committed:

   ```bash
   rg -i "(api[-_ ]?key|project[-_ ]?id|secret|token)" .
   ```

2. Run the full local release check:

   ```bash
   npm run release:check
   ```

3. Bump `version` in `agents/openclaw/plugin/package.json` and `agents/openclaw/plugin/openclaw.plugin.json`.

4. Tag the release and create a GitHub release from the tag (optional but good for changelog + audit trail).

## Package dry run

```bash
npm --prefix agents/openclaw/plugin pack --dry-run
```

Confirm the tarball lists `dist/`, `skills/`, `openclaw.plugin.json`, and `README.md`.

## Publish to npm (recommended)

From `agents/openclaw/plugin` (must be logged into npm with rights to the package scope/name):

```bash
cd agents/openclaw/plugin
npm ci
npm run build
npm publish --access public
```

First-time publish: ensure the package name `zerogpu-openclaw-plugin` is available on npm (or use a scoped name like `@zerogpu/openclaw-plugin` and update `package.json` + docs consistently).

## How users install (OpenClaw)

**Default (public npm — no repo clone):**

```bash
openclaw plugins install npm:zerogpu-openclaw-plugin
```

Optional: pin a version: `npm:zerogpu-openclaw-plugin@0.1.10`.

Avoid a bare package name (`zerogpu-openclaw-plugin` without `npm:`): OpenClaw resolves ClawHub first and users may hit spurious checksum or integrity failures. If users install via **`clawhub:…`** (for example a legacy name like `openclaw-package-zerogpu`) and see **ClawHub archive integrity mismatch**, that means the marketplace manifest hash and the served tarball disagree — a **publisher/catalog fix** is required; send them to **`npm:zerogpu-openclaw-plugin`** or the **npm-pack + local path** flow below.

**If the CLI rejects `npm:`:** Upstream OpenClaw documents `npm:<package>`; confirm with `openclaw plugins install --help`. Prefer **upgrading OpenClaw**. If users must stay on a build without `npm:`, install the same artifact from npm using **`npm pack`** (no git clone), then point OpenClaw at the unpacked folder:

```bash
tmpdir=$(mktemp -d) && cd "$tmpdir" \
  && npm pack zerogpu-openclaw-plugin@0.1.10 \
  && tar -xzf zerogpu-openclaw-plugin-*.tgz \
  && cd package \
  && openclaw plugins install ./
```

**If npm install fails:** uninstall the plugin id if present, then `openclaw plugins install npm:zerogpu-openclaw-plugin --force`, or retry after clearing a stuck OpenClaw plugin cache per `openclaw plugins doctor`.

**Maintainers / unreleased QA** — git checkout, build, then `openclaw plugins install ./`:

```bash
git clone https://github.com/zerogpu/zerogpu-router.git
cd zerogpu-router/agents/openclaw/plugin
npm ci
npm run build
openclaw plugins install ./
```

**GitHub release tarball:** attach `npm pack` output to a release; unpack and `openclaw plugins install ./` in the extracted package root (same as local folder; still no full-repo clone required if you ship the tarball).

## Post-publish smoke test

1. Register MCP (`openclaw mcp set zerogpu` …) per the root README.
2. Install the plugin via npm or `./` from a clean checkout.
3. `openclaw plugins list` and run one `zerogpu_summarize` prompt.

## Deprecating an npm version

Use npm deprecate when a version should no longer be used:

```bash
npm deprecate zerogpu-openclaw-plugin@0.1.x "use >=0.1.y; reason…"
```
