# Changelog

## 4.3.0

Two skills for capabilities the platform has been serving that neither plugin exposed: content moderation and text embeddings. Skill count goes from 20 to 22.

Both models are routable only on their own endpoints, which is why they needed skills of their own rather than a flag on an existing one: a `/responses` call with either returns `400 model_not_found`.

### Added

- **`moderate`** wraps `zerogpu moderate`. Screens text against OpenAI's 13 safety categories via `zlm-v1-moderation-edge` (86M params, \$0.02 / \$0.05 per 1M input/output tokens) and returns the native moderations envelope — a `flagged` verdict, per-category booleans, and calibrated `category_scores` — so it drops into any pipeline written against `omni-moderation-latest`. In ZeroGPU's [published benchmarks](https://zerogpu.ai/benchmarks/moderation-edge) it beats omni-moderation on the binary safe/unsafe call and on 9 of 13 categories. The skill tells the agent to report the verdict and only the categories that came back true, without restating the flagged text, and to run the check even when the passage is unpleasant — reporting a flag is the point of the skill, not a reason to decline it.
- **`embed`** wraps `zerogpu embed`. Turns text into a 384-dimensional vector for semantic search, RAG retrieval, clustering, and deduplication. Defaults to `all-minilm-l6-v2` (22.7M params, 256-token window), the general-purpose choice for short chunks; `-m bge-small-en-v1.5` (33.4M params, 512-token window) is tuned for English retrieval and is the one to reach for when chunks run long or ranking quality is the bottleneck. Both cost \$0.50 per 1M input tokens and bill nothing on output, and both return the same vector width, so they are interchangeable in an existing index. The skill explicitly tells the agent not to print 384 floats into the conversation unless you ask for them.

### Changed

- **The glm-5.2 cost comparison was wrong in four places, and it was steering routing.** `gpt-oss-120b` was repriced to \$0.15 / \$0.60 per 1M, but these skills still quoted \$0.03 / \$0.10 and told the agent that `chat-glm` costs "roughly 20x" `chat`. At the real prices it is about 7x on input and 6x on output. That multiplier is not decoration: it sits in the bodies of `chat` and `chat-glm` — and in `chat-glm`'s `description`, which is what the agent matches on — precisely to push work down to the cheaper model, so a 3x-inflated figure was distorting the choice in both directions. Corrected in both skills and the plugin README's routes table. The neighbouring claims were re-derived and both still hold: glm-5.2 is still over 50x the 1.2B edge models (\$1.10 against \$0.02), and `chat-deepseek` is still roughly a sixteenth of `chat-glm` (\$0.07 against \$1.10).

### Known issues

- **Neither new skill works until the CLI ships the commands.** `zerogpu moderate` and `zerogpu embed` do not exist in any published `zerogpu-cli` release, including 3.7.0; both skills fail with an unknown-command error until they do. This is the same shape as `chat-deepseek`, which shipped against a model the API had not enabled yet and started working untouched. The assumed surface is the text as the first positional argument, plus `-m` on `embed` for the model, matching `zerogpu chat`. If the CLI lands different names or flags, only the two `SKILL.md` files change.

### Requires

- `zerogpu-cli` >= the release that adds `moderate` and `embed`. Every other skill in this plugin is unaffected and keeps working on 3.7.0.

## 4.2.0

**The `summarize` skill has never worked.** Not in this release, not in 4.1.0, not in any prior version — for any user. It is renamed to **`zerogpu-summarize`** and works now. If you installed this plugin to offload summarization, that offload was not happening.

### Fixed

- **`summarize` never loaded, silently.** OpenClaw ships its own bundled skill named `summarize` (the summarize.sh CLI, for URLs, YouTube, podcasts, and PDFs). Two skills cannot share a name, and the bundled one won. Nothing errored and nothing warned — the skill simply was not there, so the agent summarized with its own frontier model instead: no edge offload, no backing-model line, no savings recorded. Renaming to `zerogpu-summarize` sidesteps the collision entirely. It is now the only skill here whose name is not the bare task name; every other skill is unchanged.
- **The skill's description now stakes out the boundary against the bundled skill.** Both load side by side, and the agent chooses between them on description alone, so `zerogpu-summarize` claims plain-text passages already in the conversation and explicitly cedes URLs, videos, PDFs, and local files to the bundled `summarize`. Ask for a link to be summarized and you still get the bundled skill — that is correct; the `zerogpu` CLI takes text only and cannot fetch a URL.

### Requires

- **`zerogpu-cli` >= 3.5.0.** The `zerogpu summarize` command underneath this skill was independently broken: it posted to the Responses API, which does not serve `llama-3.1-8b-instruct-fast`, so every call returned `400 invalid_prompt`. 3.5.0 routes it to Chat Completions and adds the system prompt that makes the model summarize rather than answer the passage. Both fixes are needed for this skill to work — run `npm install -g zerogpu-cli@latest` when you upgrade.

### Internal

- **CI now fails on skill-name collisions.** `openclaw-plugin-validate` diffs the plugin's skill names against `openclaw/skills/*` in the installed dependency, and separately checks that `openclaw.plugin.json`, the skill directories, and each `SKILL.md` `name:` field all agree. OpenClaw adds bundled skills continuously; the next collision breaks the build instead of shipping dead.

## 4.1.0

Two skills for the open-weight models the docs catalog gained, both with a 1,048,576-token context window. Skill count goes from 18 to 20.

The reason to care about either is size: `chat` tops out at a 131,072-token context, and until now nothing here went past it.

### Added

- **`chat-glm`** wraps `zerogpu chat -m glm-5.2`. A 753B MoE flagship (8 of 256 experts per token) with a 1M-token context, for whole repositories, book-length documents, and long agent transcripts. It is the most capable model on the platform and the most expensive by a wide margin: \$1.10 / \$3.50 per 1M input/output tokens, against \$0.03 / \$0.10 for `chat` and \$0.02 / \$0.05 for the edge models. That is roughly 20x `chat` and over 50x `chat-liquid`, so this is the one skill where the usual savings framing does not hold. Its description says so explicitly, to keep the host model from picking it for prompts that `chat` would handle.
- **`chat-deepseek`** wraps `zerogpu chat -m deepseek-v4-flash`. A 284B MoE model (13B active per token) with the same 1M context, tuned for coding and agentic workflows, at \$0.07 / \$0.14 per 1M. Roughly a sixteenth of `chat-glm`, so it is the better default whenever the task is code or tool-use rather than sheer input size.

Both models are served by the Chat Completions API rather than the Responses API; the CLI routes them automatically.

### Changed

- **`chat` now points at the new skills.** Its "for X use Y" line previously stopped at `chat-qwen`; it now also names `chat-deepseek` and `chat-glm` for input that exceeds its 131K context.
- **The root README's routes table was rewritten.** It had drifted badly: it claimed eleven routes, used the retired MCP-era `zerogpu_*` tool names rather than skill names, listed `zerogpu_chat` as `LFM2.5-1.2B-Instruct` (the default moved to `gpt-oss-120b` in 4.0.0), still showed the old `zlm-v1` enriched IAB id, and omitted `classify-domain`, `generate-followups`, `chat-liquid`, and `chat-qwen` entirely.

### Known issues

- **`chat-deepseek` does not work yet.** `deepseek-v4-flash` is published in the ZeroGPU API reference but not yet served: the API returns `404 model_not_found` for it. The skill is correct per the published spec and will start working the moment the platform enables the model, with no further change here. `chat-glm` was verified working end to end.

### Requires

- `zerogpu-cli` >= 3.4.0, the release that added `glm-5.2` and `deepseek-v4-flash` to the `chat --model` allowlist. Earlier versions reject both with `Unknown model` before any request is made. Run `npm install -g zerogpu-cli@latest` before upgrading this plugin.

## 4.0.0

`chat` now runs on **`gpt-oss-120b`** instead of `LFM2.5-1.2B-Instruct`. The old edge-model behavior moves to a new `chat-liquid` skill, and `chat-gpt-oss` is removed because `chat` now covers it. Skill count stays at 18.

### Breaking

- **`chat-gpt-oss` removed.** `chat` targets the same model, so the two were duplicates. Point anything that called `chat-gpt-oss` at `chat`; the command, output, and cost are identical.
- **`chat` switched models,** `LFM2.5-1.2B-Instruct` to `gpt-oss-120b`. That is 1.2B parameters to a 117B MoE, and a 32,768-token context to 131,072. Answers improve materially on long documents and multi-step instructions, and cost per call goes up: `gpt-oss-120b` is \$0.03 / \$0.10 per 1M input/output tokens against \$0.02 / \$0.05 for the edge model, so roughly 1.5x input and 2x output. Both stay far below frontier pricing. `gpt-oss-120b` also emits a reasoning trace; the skill omits the CLI's `-r` flag, so only the final answer prints.
- **`chat` now requires `zerogpu-cli` ≥ 3.3.0,** the release that added `chat --model`. It previously ran on any 3.x. Run `npm install -g zerogpu-cli@latest` before upgrading this plugin.

**To keep the old behavior,** use the `chat-liquid` skill wherever you used `chat`.

### Added

- **`chat-liquid`** wraps `zerogpu chat -m LFM2.5-1.2B-Instruct`, the fastest and cheapest chat on the platform. Same model and flags `chat` used in 3.1.1. Its internal quoting was switched to the heredoc-into-variable form the other model skills use, which changes nothing about what reaches the model.

### Changed

- Every chat skill now passes `--model` explicitly instead of relying on the CLI default, so a future change to that default cannot silently move a skill onto another model.
- `plugin/README.md`: the Generation table now lists `chat` on `gpt-oss-120b` and `chat-liquid` on `LFM2.5-1.2B-Instruct`, and the Data & privacy skill list is updated.

## 3.1.1

Documentation punctuation only. **No skill, model, or output changes.** All 18 skills behave exactly as they do in 3.1.0.

### Changed

- `plugin/README.md`, the ClawHub listing: removed all 21 em dashes. Each sentence was repunctuated to fit rather than having the dash swapped for a hyphen. The tagline and feature bullets take colons, joined independent clauses take a semicolon or a full stop, and asides move into parentheses. The three worked examples now read "**Summarize** a meeting recap", "**Classify** a support ticket", and "**Redact PII** from a CRM note".
- `../README.md`, the OpenClaw integration page: same treatment, 4 em dashes removed.

No content was added or removed. Badges, topic tags, the grouped skill tables, the Data & privacy section, and every command and model id are untouched.

## 3.1.0

Catches the plugin up to the [ZeroGPU model catalog](https://docs.zerogpu.ai/docs/model-catalog), which added three models and renamed a fourth, and to `zerogpu-cli` 3.3.0, which added the commands to reach them. **Four new skills; the existing 14 are unchanged.** Also a rewritten ClawHub listing.

Keep the CLI current — `npm install -g zerogpu-cli@latest` — and every skill works.

### Added

- `generate-followups` — suggested next questions for a passage, "people also ask" style. Model `zlm-v1-followup-questions-edge`, wrapping `zerogpu generate_followups`. The CLI has shipped this command since 3.1.0; the plugin never exposed it.
- `classify-domain` — IAB classification from a bare hostname, no page fetch. Model `zlm-v1-iab-domain-classifier`, wrapping `zerogpu classify_domain`. Payloads run up to 10x smaller than sending page text, which is the point for bidstream enrichment and allow/deny-list scoring. The agent strips the scheme, path, and query before calling, so pasting a full URL works.
- `chat-gpt-oss` — heavier chat via `gpt-oss-120b` (117B MoE, 131,072-token context) for long documents and multi-step instructions the 1.2B edge models can't carry. Wraps `zerogpu chat -m gpt-oss-120b`.
- `chat-qwen` — heavier multilingual chat via `qwen3-30b-a3b-fp8` (30.5B MoE, 100+ languages). Wraps `zerogpu chat -m qwen3-30b-a3b-fp8`; this model is served by the Chat Completions API rather than the Responses API, which the CLI handles.

Both new chat models return a reasoning trace. Neither skill passes the CLI's `-r` flag, so only the final answer is printed — matching how `chat` behaves. `chat-thinking` remains the skill that surfaces reasoning.

Savings tracking covers all four: every call goes through the CLI, and 3.3.0 prices each of these models in its savings table, so they contribute to the `cost-savings` skill like any other.

### Changed

- `classify-iab-enriched` — documented model renamed `zlm-v1-iab-classify-edge-enriched` → `zlm-v2-iab-classify-edge-enriched`, following the catalog and CLI 3.3.0. No behavior change: the skill still shells out to `zerogpu classify_iab_enriched`.
- **`plugin/README.md` rewritten for the ClawHub listing.** Leads on the positioning that matters — open-weight and small language models, OpenAI-compatible APIs, pay-as-you-go, and a catalog growing by roughly a model a day. Adds a topic-tag row and badges for docs, API compatibility, and pricing alongside the existing website/dashboard/license badges, matching how established ClawHub plugins present themselves. The 18 skills are now grouped into Classification, Extraction & PII, Generation, and Account tables instead of one flat list, and Links became a Support table with docs and issues rows.
- **Plugin description** (`openclaw.plugin.json`, `plugin/package.json`) — "trivial AI tasks … small/nano models" reworded to "your AI tasks … open-weight and small language models", noting OpenAI compatibility and pay-as-you-go pricing. This is the copy ClawHub shows on the plugin card.
- **Package keywords** — added `open-weight-models`, `small-language-models`, `openai-compatible`, `classification`, `pii-redaction`, and `summarization`. ClawHub renders these as the listing's topic tags, so the plugin now surfaces for those searches.
- **No version pinning in the docs.** Dropped the stale `clawhub:zerogpu-router@2.0.0` pin example and the `zerogpu-cli` ≥ 3.3.0 floor callout; install guidance is now simply `zerogpu-cli@latest`. Functionally unchanged — the three new model skills still need the CLI release that carries `chat --model` and `classify_domain`, users just aren't asked to track version numbers.

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