# Changelog

## 1.5.0

Skill refresh: the zero-shot classifier gains a confidence threshold, and sign-in drops the retired Project ID. **The other 10 model skills and their outputs are unchanged.**

### Changed

- `classify-zero-shot` — added an optional `-t <0..1>` threshold flag that filters out labels below a confidence (handy for multi-label output). Existing single-label usage is unchanged.
- `signin` — removed the `--project-id` flag and the Project ID prompt. `zerogpu login` now takes just the API key.
- `agents/claude/.claude-plugin/plugin.json`: version `1.4.0` → `1.5.0`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.4.0

Maintenance release: the plugin now carries its own release workflow. The release script and its guide live alongside the plugin under `agents/claude/`, the script gained an interactive version-bump prompt and a hard changelog gate, and CI no longer forces a changelog edit on every PR. **None of the 11 model skills or their outputs change** — installing this is behavior-identical to 1.3.1.

### Changed

- **Release script** — added `scripts/claude-release` (was a repo-root script). Run with no argument it prompts for `patch | minor | major`; it resolves paths from the git root so it runs from any directory; and it now **hard-fails before bumping or pushing** if `agents/claude/CHANGELOG.md` has no `## <version>` heading for the release being cut.
- **Release guide** — added `docs/CLAUDE_PLUGIN_RELEASE_GUIDE.md` documenting the end-to-end flow.
- **CI** — `claude-plugin-validate` no longer requires a CHANGELOG edit on every PR touching `agents/claude/`, and skips CHANGELOG-only changes. The changelog is enforced once, at release time, so several PRs can share a single release section.
- `agents/claude/.claude-plugin/plugin.json`: version `1.3.1` → `1.4.0`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.3.1

Fixes the cost-savings note appearing after **every** routed call. The 1.3.0 relay instruction was loose enough that Claude treated savings as always-relevant and appended a "run `/zerogpu-router:cost-savings`" call-to-action on every response — even though the underlying `💰 ZeroGPU savings` note only fires occasionally (the CLI gates it to roughly 1 in 4–5 calls, emitted on stderr). The cadence was never the problem; the skill prompt was over-surfacing it.

### Changed

- The 11 auto-invoked model skills (`chat`, `chat-thinking`, `classify-*`, `extract-*`, `redact-pii`, `summarize`): tightened the relay line so Claude appends the `💰 ZeroGPU savings …` line **only when it is literally present** in the command output, verbatim, and otherwise says nothing about savings and does not suggest the cost-savings command. Net effect — most responses carry no savings mention; the note shows only on the occasional call where the CLI emits it.
- `agents/claude/.claude-plugin/plugin.json`: version `1.3.0` → `1.3.1`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.3.0

Adds a cost-savings feature so the value of routing trivial work to ZeroGPU is visible. Every routed call records how many Claude tokens it offloaded and the estimated dollars saved, persisted in `~/.zerogpu/savings.json` (alongside the existing credentials). After some responses, a balanced random note (≈ once every 4–5 calls, never twice in a row) surfaces the running total; the new manual `cost-savings` skill prints the full breakdown on demand.

Requires `zerogpu-cli` ≥ 2.3.0, which computes and stores the savings.

### Added

- `cost-savings` skill (`skills/cost-savings/SKILL.md`, manual-only via `disable-model-invocation: true`) — runs `zerogpu cost_savings` and relays a cumulative report: dollars saved, Claude tokens offloaded, routed-call count, per-model breakdown, and the baseline model used.
- A `💰 ZeroGPU savings …` note that the CLI emits to stderr on a balanced random cadence after model commands. Token counts are actual (from the API `usage`); dollar figures estimate what the same tokens would have cost on Claude (default baseline `claude-opus-4-8`, overridable via `ZEROGPU_SAVINGS_MODEL`).

### Changed

- The 11 auto-invoked model skills (`chat`, `chat-thinking`, `classify-*`, `extract-*`, `redact-pii`, `summarize`) gained one trailing line instructing Claude to relay the `💰 ZeroGPU savings` note when present.
- `agents/claude/.claude-plugin/plugin.json`: version `1.2.1` → `1.3.0`; `description` mentions the savings feature.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.2.1

Renames the manual `login` skill to `signin` for clearer intent. The underlying `zerogpu login` CLI subcommand is unchanged — only the skill's name and its slash invocation move from `/zerogpu-router:login` to `/zerogpu-router:signin`. Anyone scripting the old invocation must update it.

### Changed

- `skills/login/` → `skills/signin/` (directory renamed); `SKILL.md` `name:` field `login` → `signin`. The `zerogpu login` body command and `allowed-tools: Bash(zerogpu login*)` are untouched.
- `agents/claude/README.md`: per-skill heading, synopsis, example, lookup-table row, and troubleshooting steps now reference `/zerogpu-router:signin`; the manual-only intro lists `signin`.
- `agents/claude/COOKBOOK.md`, `skills/status/SKILL.md`: "not signed in" guidance now points to `/zerogpu-router:signin`.
- `agents/claude/.claude-plugin/plugin.json`: version `1.2.0` → `1.2.1`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.2.0

Re-introduces the `summarize` skill, taking the surface from 12 to 13. It was dropped in 1.1.0 when its t5-small space was deprecated; it now runs on `llama-3.1-8b-instruct-fast`, which produces fuller, more coherent abstractive summaries than the old model.

### Added

- `summarize` skill (`skills/summarize/SKILL.md`) — condense a passage into a short summary via `llama-3.1-8b-instruct-fast`. Auto-invokes on "summarize", "TL;DR", "give me the gist", "condense this." Captures `$ARGUMENTS` into `$ZGPU_TEXT` through a single-quoted heredoc, consistent with the shell-safe pattern adopted in 1.1.2.

### Changed

- `agents/claude/.claude-plugin/plugin.json`: version `1.1.2` → `1.2.0`; `description` updated (12 → 13 skills, "summarization" restored); `keywords` re-adds `summarization`.
- `agents/claude/README.md`: added a `summarize` per-skill section with a worked board-meeting example and illustrative output; restored the lookup-table row; intro and skill count updated to 13.
- Root `README.md`: Claude Code skill count updated to 13; "summarize this" restored to the auto-invoke examples.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.1.2

Bug-fix patch. All ten text-accepting skills passed `$ARGUMENTS` directly into the `!` auto-exec block, so any input containing shell metacharacters (newlines, parens, `$`, `&`, `;`, `*`, backticks, quotes) was parsed by zsh and produced errors like `no matches found: (...)` or `command not found: <word>` before reaching the CLI. The fix wraps text in a single-quoted heredoc so the shell treats it as opaque data.

### Changed

- `skills/redact-pii/SKILL.md`, `skills/chat-thinking/SKILL.md`, `skills/classify-iab/SKILL.md`, `skills/classify-iab-enriched/SKILL.md`: text-only skills now capture `$ARGUMENTS` into `$ZGPU_TEXT` via a single-quoted heredoc and pass it as `"$ZGPU_TEXT"`. The model passes raw text — no escaping required, any input is shell-safe.
- `skills/chat/SKILL.md`, `skills/classify-structured/SKILL.md`, `skills/classify-zero-shot/SKILL.md`, `skills/extract-entities/SKILL.md`, `skills/extract-json/SKILL.md`, `skills/extract-pii/SKILL.md`: flag-mixed skills keep `zerogpu … $ARGUMENTS` but add a required "Quoting" section directing the model to wrap the text portion as `"$(cat <<'ZGPU_T' … ZGPU_T )"` with flags following. Plain `"…"` quoting is now explicitly disallowed.

### Unchanged

- `skills/login/SKILL.md`, `skills/status/SKILL.md`: no text input, no change needed.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.1.1

Docs-only patch. Rewrites the `redact-pii` quickstart example so it matches what `gliner-multi-pii-v1` actually masks — the previous passage claimed names, emails, phones, internal hostnames, IPs, card last-fours, and addresses would all come back redacted, but the model only reliably catches names, emails, phones, social handles, and street addresses. The example now uses only PII the model is tuned for, and a callout points to `extract-entities` with custom labels for project-specific identifiers.

### Changed

- `agents/claude/README.md`: trimmed the `redact-pii` quickstart passage to PII the model masks cleanly; softened placeholder claim (uppercase labels like `[PERSON]`, `[EMAIL]`, `[PHONE_NUMBER]`, `[ADDRESS]` rather than fixed tag strings); added callout for hostnames/IPs/contract numbers/card digits.
- Root `README.md`: same edits in the Claude Code quick-start section.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.1.0

Trims the skill surface from 14 to 12. The two HF-Space generation skills (`summarize`, `generate-followups`) were deprecated upstream and have been removed; the quickstart in `agents/claude/README.md` now demonstrates `redact-pii` instead of `summarize`.

### Removed

- `summarize` skill (`skills/summarize/SKILL.md`) — t5-small space deprecated.
- `generate-followups` skill (`skills/generate-followups/SKILL.md`) — `zlm-v1-followup-questions-edge` space deprecated.

### Changed

- `agents/claude/.claude-plugin/plugin.json`: version `1.0.0` → `1.1.0`; `description` updated (14 → 12 skills, dropped "summarization" and "follow-ups"); `keywords` no longer includes `summarization`.
- `agents/claude/README.md`: quickstart example switched from `summarize` to `redact-pii`; per-skill sections for the two removed skills deleted.
- Root `README.md`: install/usage snippets updated; Claude Code install command refreshed.
- `.gitignore`: ignore local `docs/` working directory.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.0.0

First stable release of the `zerogpu-router` Claude Code plugin. The pre-release routed all offload calls through a single model-invoked skill that called MCP tools; 1.0.0 replaces that with a fan-out of 14 narrowly-scoped skills, each shelling out to the `zerogpu` CLI. Net effect: the model picks one skill per intent instead of one skill picking one tool per intent, and there is no MCP server in the loop.

### Architecture

- **MCP → CLI.** Skills no longer call `zerogpu_*` MCP tools. Each skill is now a `SKILL.md` that runs `zerogpu <subcommand> $ARGUMENTS` via `Bash`, gated by an `allowed-tools` permission (e.g. `Bash(zerogpu classify_iab *)`). Users need the `zerogpu` CLI installed and authenticated locally.
- **One skill per capability.** The monolithic `plugins/zerogpu-router/skill/SKILL.md` and its tool-selection table are gone; the routing decision has been pushed into 14 skill `description` fields under `skills/`, where Claude's auto-invocation matches them directly.
- **Auto-discovery.** `plugin.json` no longer declares a `skills: [...]` array — skills are discovered from `skills/*/SKILL.md`.

### Skills shipped (14)

Classification:
- `classify-iab` — IAB taxonomy categories with confidence scores.
- `classify-iab-enriched` — IAB plus topics, keywords, inferred intent. Promoted from the old `enriched: true` flag into a standalone skill.
- `classify-zero-shot` — caller-supplied labels via `-l` / `--labels` (deberta-v3-small).
- `classify-structured` — multi-axis classification driven by a JSON schema `{axis: [labels...]}` (gliner2-base-v1).

Extraction:
- `extract-entities` — custom-label NER with optional `-t <threshold>` (gliner2-base-v1).
- `extract-json` — schema-driven JSON extraction with `name::type::description` field syntax.
- `extract-pii` — PII grouped by category with optional `-c` and `-t` (gliner-multi-pii-v1).
- `redact-pii` — in-line `[LABEL]` masking; complements `extract-pii`.

Generation:
- `summarize` — passage summarization (t5-small).
- `generate-followups` — follow-up question generation (zlm-v1-followup-questions-edge).
- `chat` — short single-turn replies (LFM2.5-1.2B-Instruct), with optional `-i "<system instructions>"`.
- `chat-thinking` — reasoning-trace variant (LFM2.5-1.2B-Thinking). Promoted from the old `thinking: true` flag.

Account (user-invokable only, `disable-model-invocation: true`):
- `login` — interactive or `--api-key` / `--project-id` non-interactive sign-in; persists creds and upserts `ZEROGPU_API_KEY` into the shell profile.
- `status` — show signed-in state and masked API key; exits non-zero when signed out.

### Removed

- Old `agents/claude/plugins/zerogpu-router/skill/SKILL.md` and its nested `plugin.json`.
- `zerogpu_health` tool — no longer surfaced as a skill; health is implicit in CLI exit codes.
- `blog/introducing-zerogpu-router.md` and unused assets (`assets/logo.svg`, `assets/zerogpu-dashboard.png`).

### Manifest changes

- `agents/claude/.claude-plugin/plugin.json`: version `0.1.0` → `1.0.0`; added `$schema`, `displayName: "ZeroGPU Router"`; author expanded with email and URL; `homepage` now `https://zerogpu.ai`; keywords broadened (`pii`, `ner`, `nlp`, `cost-optimization`, `small-models`, `claude-code`); removed explicit `skills` array.
- `.claude-plugin/marketplace.json`: marketplace `name` renamed `zerogpu-router` → `zerogpu` (the marketplace now namespaces the plugin, not duplicates it); added `$schema`, marketplace `description`, owner email, plugin `category: "productivity"` and `tags`.

### Docs

- `agents/claude/README.md` expanded substantially (+~600 lines) with per-skill usage, argument shapes, and the `zerogpu` CLI prerequisites.
- Root `README.md` updated to point at the new install path.

### Install

```
/plugin marketplace add github.com/zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

(Marketplace name is now `zerogpu`, not `zerogpu-router`.)
