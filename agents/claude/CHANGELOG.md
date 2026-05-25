# Changelog

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
