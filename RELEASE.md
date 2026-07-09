# Release Guide

This repository publishes two artifacts on independent release tracks:

- **`zerogpu-openclaw-plugin`** — OpenClaw plugin from `agents/openclaw/plugin/`. Distributed via npm and/or git install. Tags: `zerogpu-openclaw-plugin--v<version>`. See the [OpenClaw plugin release](#openclaw-plugin-release) section.
- **`zerogpu-router`** — Claude Code plugin from `agents/claude/`. Distributed via the in-repo Claude Code marketplace at `.claude-plugin/marketplace.json`. Tags: `zerogpu-router--v<version>` (the format Claude Code's dependency resolver expects — see `docs/plugin-dependencies.md`). See the [Claude Code plugin release](#claude-code-plugin-release) section.

The `zerogpu-cli` package — which the plugin's skills shell out to for all inference — is operated by ZeroGPU and released separately on npm.

**OpenClaw distribution:** use the **public npm registry** and/or **ClawHub**.

## OpenClaw plugin release

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

4. Create and push a tag in the format `zerogpu-openclaw-plugin--v<version>`.

Example:

```bash
git tag zerogpu-openclaw-plugin--v1.4.0
git push origin zerogpu-openclaw-plugin--v1.4.0
```

The `openclaw-plugin-release` GitHub Actions workflow will:
- validate the version
- build the plugin
- create the GitHub release
- publish to ClawHub

## Package dry run

```bash
npm --prefix agents/openclaw/plugin pack --dry-run
```

Confirm the tarball lists `dist/`, `skills/`, `openclaw.plugin.json`, and `README.md`.

## Publish to npm (optional)

The plugin is automatically published to ClawHub via CI.  
Publishing to npm is optional but recommended for direct installs.

From `agents/openclaw/plugin` (must be logged into npm with rights to the package scope/name):

```bash
cd agents/openclaw/plugin
npm ci
npm run build
npm publish --access public
```

First-time publish: ensure the package name `zerogpu-openclaw-plugin` is available on npm (or use a scoped name like `@zerogpu/openclaw-plugin` and update `package.json` + docs consistently).

## How users install (OpenClaw)

**Default (public npm — one command):**

```bash
openclaw plugins install npm:zerogpu-openclaw-plugin
```

Pin a version:

```bash
openclaw plugins install npm:zerogpu-openclaw-plugin@1.4.0
```

Always prefix with `npm:`. A bare package name (`zerogpu-openclaw-plugin` without `npm:`) makes OpenClaw resolve ClawHub first, and users may hit spurious checksum or integrity failures. If users install via **`clawhub:…`** (for example a legacy name like `openclaw-package-zerogpu`) and see **ClawHub archive integrity mismatch**, that means the marketplace manifest hash and the served tarball disagree — a **publisher/catalog fix** is required; send them to **`npm:zerogpu-openclaw-plugin`** or the tarball flow below.

**If npm install fails:** uninstall the plugin id if present, then `openclaw plugins install npm:zerogpu-openclaw-plugin --force`, or retry after clearing a stuck OpenClaw plugin cache per `openclaw plugins doctor`.

### Advanced — install from source

For local development and testing, see CONTRIBUTING.md.

### Alternative — install from npm tarball

If the CLI rejects `npm:` (confirm with `openclaw plugins install --help`; prefer **upgrading OpenClaw**), install the same artifact from npm using **`npm pack`** (no git clone), then point OpenClaw at the unpacked folder:

```bash
tmpdir=$(mktemp -d) && cd "$tmpdir" \
  && npm pack zerogpu-openclaw-plugin@1.4.0 \
  && tar -xzf zerogpu-openclaw-plugin-*.tgz \
  && cd package \
  && openclaw plugins install ./
```

**GitHub release tarball:** attach `npm pack` output to a release; unpack and `openclaw plugins install ./` in the extracted package root (same as local folder; still no full-repo clone required if you ship the tarball).

## ClawHub publishing

Publishing to ClawHub is handled automatically by CI.

On tag push:
- the plugin is built
- validated
- published to ClawHub using CLAWHUB_TOKEN

Ensure the following secret is configured:

- CLAWHUB_TOKEN (GitHub Actions secret)

## Post-publish smoke test

1. Install the plugin:

   ```bash
   openclaw plugins install npm:zerogpu-openclaw-plugin@1.4.0
   ```

2. Verify it registered — `zerogpu-openclaw-plugin` should appear in the list:

   ```bash
   openclaw plugins list
   ```

3. Run a simple summarize test. Ask the agent:

   ```text
   summarize this: Following the Q3 board review, the leadership team approved a
   phased rollout of the new billing platform starting in January. Finance expects
   the migration to cut invoicing errors by roughly 30% and shorten the collections
   cycle by about a week. Customer success will run a pilot with ten enterprise
   accounts before the general release. Any accounts still on the legacy system by
   April will be migrated automatically.
   ```

   Expected — a short, slightly mechanical summary plus a savings line, e.g.:

   ```text
   Leadership approved a phased rollout of the new billing platform starting in
   January. Finance expects ~30% fewer invoicing errors and a one-week shorter
   collections cycle. A ten-account enterprise pilot runs first; remaining legacy
   accounts migrate automatically by April.

   💰 ZeroGPU savings so far: $3.02 (26,410 Claude tokens offloaded)
   ```
   Note: the savings line appears intermittently depending on CLI output.
   Confirm the `summarize` skill invokes `zerogpu summarize` locally and returns a summary plus a savings line.

## Deprecating an npm version

Use npm deprecate when a version should no longer be used:

```bash
npm deprecate "zerogpu-openclaw-plugin@<1.4.0" "use >=1.4.0; reason…"
```

## Claude Code plugin release

The Claude Code plugin lives under `agents/claude/` and ships via the in-repo marketplace at `.claude-plugin/marketplace.json` (marketplace `zerogpu`, plugin `zerogpu-router`). No npm publish — the release artifact is the commit + tag on `main`.

- **Version source**: `agents/claude/.claude-plugin/plugin.json` → `version`.
- **Changelog**: `agents/claude/CHANGELOG.md`, one `## <version>` heading per release.
- **Tag format**: `zerogpu-router--v<version>` (required by Claude Code's dependency resolver, which filters marketplace tags by `{plugin-name}--v` prefix; see `docs/plugin-dependencies.md`).

### Cut a release

Merge your PR to `main` with `claude-plugin-validate` green (it enforces the version bump and a matching `## <version>` CHANGELOG heading), then from the repo root:

```bash
./claude-release           # patch (default)
./claude-release minor
./claude-release major
```

The script bumps `plugin.json`, commits, pushes the commit to `origin/main`, then runs `claude plugin tag --push` (the official Claude Code CLI command) from `agents/claude/`. The CLI derives the tag name from the manifest, validates the plugin contents, checks that `plugin.json` and the marketplace entry agree on the version, and pushes the tag — producing `zerogpu-router--v<new>` in the spec-conformant format. The `claude-plugin-release` workflow then fires on the tag push, slices the matching `## <version>` section from the CHANGELOG, and creates the GitHub release. No manual `gh release create` needed.

Requires the `claude` CLI on PATH: `npm install -g @anthropic-ai/claude-code`.

### How users install

```
/plugin marketplace add github.com/zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

Claude Code dedupes installs by `plugin.json` `version` — this is why the validate workflow blocks PRs touching `agents/claude/` without a bump.
