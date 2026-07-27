# Changelog

## 3.1.0

Catches the plugin up to the [ZeroGPU model catalog](https://docs.zerogpu.ai/docs/model-catalog), which added three models and renamed a fourth, and to `zerogpu-cli` 3.3.0, which added the commands to reach them. **Four new skills; the existing 14 are unchanged.**

Requires `zerogpu-cli` **≥ 3.3.0** for the three new model skills — `chat --model` and `classify_domain` landed in that release. The other 15 skills still work on any 3.x.

### Added

- `generate-followups` — suggested next questions for a passage, "people also ask" style. Model `zlm-v1-followup-questions-edge`, wrapping `zerogpu generate_followups`. The CLI has shipped this command since 3.1.0; the plugin never exposed it.
- `classify-domain` — IAB classification from a bare hostname, no page fetch. Model `zlm-v1-iab-domain-classifier`, wrapping `zerogpu classify_domain`. Payloads run up to 10x smaller than sending page text, which is the point for bidstream enrichment and allow/deny-list scoring. The agent strips the scheme, path, and query before calling, so pasting a full URL works.
- `chat-gpt-oss` — heavier chat via `gpt-oss-120b` (117B MoE, 131,072-token context) for long documents and multi-step instructions the 1.2B edge models can't carry. Wraps `zerogpu chat -m gpt-oss-120b`.
- `chat-qwen` — heavier multilingual chat via `qwen3-30b-a3b-fp8` (30.5B MoE, 100+ languages). Wraps `zerogpu chat -m qwen3-30b-a3b-fp8`; this model is served by the Chat Completions API rather than the Responses API, which the CLI handles.

Both new chat models return a reasoning trace. Neither skill passes the CLI's `-r` flag, so only the final answer is printed — matching how `chat` behaves. `chat-thinking` remains the skill that surfaces reasoning.

Savings tracking covers all four: every call goes through the CLI, and 3.3.0 prices each of these models in its savings table, so they contribute to the `cost-savings` skill like any other.

### Changed

- `classify-iab-enriched` — documented model renamed `zlm-v1-iab-classify-edge-enriched` → `zlm-v2-iab-classify-edge-enriched`, following the catalog and CLI 3.3.0. No behavior change: the skill still shells out to `zerogpu classify_iab_enriched`.
- `plugin/README.md` — skills table covers all 18 skills, and notes the `zerogpu-cli` ≥ 3.3.0 floor for the three new model skills.

## 3.0.1

Fixes a gateway boot failure on OpenClaw `2026.7.1`. Installs of this plugin could leave the gateway
crash-looping after an OpenClaw upgrade, never reporting ready. **No skill behavior or output changes.**

### Fixed
- Removed `peerDependencies.openclaw` from the published `plugin/package.json`. `2026.7.1` added a
  startup plugin-convergence gate that fails closed: for any plugin whose shipped manifest declares
  an `openclaw` peer, it audits that the plugin's `node_modules/openclaw` symlink still resolves to
  the *live* host package root. That symlink is an absolute path written once at plugin-install time,
  so an OpenClaw upgrade that relocates the package root (notably a Node version change — `2026.7.1`
  narrowed `engines.node` to `>=22.22.3 <23 || >=24.15.0 <25 || >=25.9.0`, and per-version global
  prefixes under nvm/fnm/volta move with it) leaves it stale. The audit then fails with
  `missing-openclaw-peer-link` and the gateway refuses to report ready.

  The gateway's own repair pass for this (`repairManagedNpmOpenClawPeerLinks`) only walks managed npm
  roots under `~/.openclaw/npm`. This plugin installs as a ClawHub code-plugin into
  `~/.openclaw/extensions`, so it was audited but never repaired — the failure persisted across every
  restart instead of self-healing.

  The peer declaration was never needed at runtime: the host loader aliases `openclaw/plugin-sdk/*`
  to its own modules, so `dist/index.js` resolves `definePluginEntry` without the symlink. `openclaw`
  stays in `devDependencies` for the build and type-check, which are unchanged.

**Recovering an already-broken install:** the gate reads the `package.json` of the *installed* copy
under `~/.openclaw/extensions/`, so that directory has to be replaced — publishing this release does
not repair machines on its own. Reinstalling in place clears the failure:

```sh
openclaw plugins install clawhub:zerogpu-router --force
```

`--force` is required: a plain `plugins install` refuses when the plugin directory already exists.
To only unbrick the gateway without reinstalling, `openclaw plugins uninstall zerogpu-router --force`
also restores boot. Note that `openclaw plugins update` skips `path`-source installs entirely.

## 3.0.0

Security and compliance release. Resolves every finding from the ClawHub security audit and moves the plugin onto a patched OpenClaw gateway. **Breaking:** the minimum supported gateway is now `2026.7.1` — older gateways can no longer install this version.

### Breaking
- Minimum OpenClaw gateway raised to **`2026.7.1`**. `peerDependencies.openclaw`, `openclaw.compat.pluginApi`, and `openclaw.compat.minGatewayVersion` moved from `>=2026.4.0` to `>=2026.7.1` (`plugin/package.json`). Upgrade the gateway before upgrading the plugin.

### Security
- Bumped `openclaw` off the vulnerable `2026.4.0` / `2026.4.27` line (each flagged with 10 published advisories) to the current stable **`2026.7.1`** across `peerDependencies`, `devDependencies`, and the `openclaw.build` block; refreshed `plugin/package-lock.json` so the build toolchain no longer resolves a flagged release.

### Added
- Data-transfer disclosures on every content-routing skill (`chat`, `chat-thinking`, `summarize`, `classify-iab`, `classify-iab-enriched`, `classify-structured`, `classify-zero-shot`, `extract-entities`, `extract-json`, `extract-pii`, `redact-pii`) — each now states up front that input is sent to ZeroGPU's hosted API, not processed locally, and warns against submitting secrets or regulated data.
- The PII skills (`redact-pii`, `extract-pii`) additionally note that the **raw, un-redacted text** reaches the service before masking/extraction.
- A **Data & privacy** section in `plugin/README.md` covering third-party transmission, PII handling, and credential storage.
- An up-front warning in the `signin` skill that it persists an API key to local config and upserts `ZEROGPU_API_KEY` into the user's shell profile, plus guidance against passing the key as a literal argument on shared machines.

### Changed
- `plugin/README.md` no longer implies inference runs locally — the "runs the CLI locally" line now clarifies that the local CLI **sends text to ZeroGPU's hosted API** — and the plain-language trigger guidance gains an explicit "your input leaves your machine" opt-in caveat.

### Fixed
- Build no longer fails under the `2026.7.x` SDK: the default export in `plugin/src/index.ts` is annotated with `ReturnType<typeof definePluginEntry>` so the emitted declaration references the public SDK entry point instead of an internal type module (TS2742).

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