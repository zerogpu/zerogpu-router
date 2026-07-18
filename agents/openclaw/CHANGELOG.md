# Changelog

## 2.1.2

Cost-savings output is now host-neutral, and the dollar figure is a rounded estimate. The `💰 ZeroGPU savings` note (and the `cost_savings` report) previously said "Claude" — misleading in OpenClaw, where Claude isn't the agent host but the pricing baseline used to value the savings. It now reads **"frontier-model tokens offloaded"** / **"instead of your frontier model."**

Requires `zerogpu-cli` ≥ 3.2.1, which emits the reworded, rounded output. **No skill routing or logic changes.**

### Changed
- Savings output wording — "Claude" → "frontier model" in the running-total note and the `cost_savings` report, removing the ambiguity between the agent host and the pricing baseline. The dollar figure now rounds to whole dollars (`≈ $2`, or `under $1` below a dollar); token counts stay exact; the baseline is still shown explicitly (`vs baseline claude-opus-4-8`) and overridable via `ZEROGPU_SAVINGS_MODEL`.
- `README.md`, `plugin/README.md` — updated the illustrative savings lines (`$2.14` → `≈ $2`, "Claude tokens offloaded" → "frontier-model tokens offloaded").
- `openclaw.plugin.json`, `package.json`: version `2.1.1` → `2.1.2`.

## 2.1.1

Docs fix. **No skill behavior or output changes** — installing this is
behavior-identical to 2.1.0.

### Fixed
- Quickstart now installs the `zerogpu` CLI explicitly (`npm install -g zerogpu-cli`) and runs
  `zerogpu login` *before* `openclaw plugins install` (`README.md`, `plugin/README.md`).
  Installing the plugin does not provision the CLI — the `requires.bins` install spec only runs
  when a skill executes inside an agent turn, so a bare `zerogpu login` in the terminal failed
  with `command not found` on a fresh machine.
- Dropped the "OpenClaw provisions the CLI automatically on first use — no manual global install"
  guidance from both READMEs, which contradicted the terminal login step.

## 2.1.0

Metadata-only release. **No skill behavior or output changes** — installing this is
behavior-identical to 2.0.1.

### Added
- Plugin icon (`openclaw.plugin.json`), shown in the ClawHub plugin listing.

## 2.0.1

Docs and metadata fixes. **No skill behavior or output changes** — installing this is
behavior-identical to 2.0.0.

### Fixed
- Removed a stray reference to a nonexistent "follow-ups" skill from the plugin description
  (`package.json`, `openclaw.plugin.json`) and the plugin README. The plugin ships 14 skills;
  there is no follow-ups route.

## 2.0.0

### Changed
- Renamed the plugin to **`zerogpu-router`** (was `zerogpu-openclaw-plugin`).
- Distributed as a ClawHub **code-plugin** package. Install with:

```
openclaw plugins install clawhub:zerogpu-router
zerogpu login
```

- The `zerogpu` CLI is now provisioned automatically: each skill declares it via
  `requires.bins` + a `node` install spec (`zerogpu-cli`), so OpenClaw installs it on
  first use — no manual `npm install -g zerogpu-cli`.
- The release pipeline now publishes the **plugin package** to ClawHub
  (`clawhub package publish`) instead of publishing individual skills. All 14 skills
  ship bundled inside the plugin.
- `signin` no longer requires a Project ID — `zerogpu login` now takes just the API key.
- Skill copy polish — restored per-skill backing-model names in descriptions and the
  "savings note is occasional" guidance, so skills no longer over-surface the
  `cost-savings` skill.

## 1.4.0

### Added
- CLI-based ZeroGPU integration for OpenClaw
- Introduced modular skill structure (11 subskills)

### Changed
- Replaced MCP routing with direct `zerogpu` CLI execution
- Removed dependency on MCP server configuration
- Simplified plugin installation (no `openclaw mcp set` required)

### Install

```
npm install -g zerogpu-cli
zerogpu login
openclaw plugins install npm:zerogpu-openclaw-plugin
```