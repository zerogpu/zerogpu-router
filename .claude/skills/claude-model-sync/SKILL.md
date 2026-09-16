---
name: claude-model-sync
description: Reconcile the ZeroGPU Router Claude Code plugin (`agents/claude/`) with the live model catalog API (https://api-dashboard.zerogpu.ai/api/models), which is the sole source of truth — correct every price, context window, parameter count, and cost comparison the skills and README state, move skills to models the API renamed, and remove models it no longer returns, across `agents/claude/skills/*/SKILL.md`, `agents/claude/README.md`, and `.claude-plugin/marketplace.json` — then bump the plugin version, write the matching CHANGELOG section, cut a branch from `main`, commit, and open a PR automatically. Claude Code plugin only; never touches the OpenClaw plugin. Runs unattended — it never asks questions. Use this skill whenever the user asks to "check the plugin's models", "sync the Claude plugin with the model catalog", "fetch models from the dashboard API and compare", "fix the pricing/context windows in the skills", or schedules a routine to keep the Claude Code plugin matched to what the API serves.
---

# Model sync — Claude Code plugin

`https://api-dashboard.zerogpu.ai/api/models` **is the sole source of truth.** Its response defines which models exist and every machine-readable fact about them — task, context window, pricing, parameter count. Where the Claude Code plugin disagrees, the plugin is wrong and this skill corrects it: the model each skill calls, the skill descriptions Claude routes on, the numbers and cost comparisons in skill bodies, and the plugin README.

**This skill runs unattended.** It asks nothing and waits for nothing. Every decision below is a rule with a determined answer, so a scheduled run and an interactive run do the same thing. When a rule leaves genuine slack — the wording of a rewritten clause, how to phrase a changelog bullet — pick the option most consistent with the surrounding file and note the choice in the final summary. Never end a run with an open question, a "should I…", or work deferred for a human.

Work the three loops in order: **[correct](#1-correct-what-disagrees)**, **[rename](#2-follow-renames)**, **[remove](#3-remove-what-is-gone)**. Then [verify](#4-verify), and [bump, write the changelog, branch, and open a PR against `main`](#5-bump-changelog-branch-and-open-the-pr) — every run that changes a file ends in a PR carrying a version bump and a changelog section, without being asked.

## Scope

| In scope — edit | Out of scope — never edit |
| --- | --- |
| `agents/claude/skills/*/SKILL.md` | `agents/openclaw/**` — the OpenClaw plugin has its own sync |
| `agents/claude/README.md` | root `README.md` — its Routes table covers both plugins; list its stale lines in the PR body instead |
| `.claude-plugin/marketplace.json` (description only) | older sections of `agents/claude/CHANGELOG.md` — they are history |
| `agents/claude/.claude-plugin/plugin.json` (`version`, and `description` on a removal) | `docs/`, `.github/`, `package.json`, this skill |
| `agents/claude/CHANGELOG.md` (a new top section) | |

**The plugin does not depend on CLI model changes.** Every inference skill calls one of the `zerogpu` CLI's model-agnostic endpoint commands — `chat_completions`, `moderations`, `embeddings` — and names its model with `-m`. Those commands take any model id, so a model sync never needs a CLI release. Never change the `zerogpu-cli >= 3.8.0` requirement, and never switch a skill to a per-task CLI command.

## Step 0 — audit

```bash
python3 .claude/skills/claude-model-sync/scripts/audit-models.py
```

| Label | Meaning | Handled by |
| --- | --- | --- |
| `PROSE` | a line states a price, context window, or parameter count that is true of none of the models it is about, with `file:line` | [loop 1](#1-correct-what-disagrees) |
| `RENAME` | a model a skill calls that the API now serves under a longer id, plus every file to update | [loop 2](#2-follow-renames) |
| `ORPHAN` | a model a skill calls that the API does not return, plus every file to clean | [loop 3](#3-remove-what-is-gone) |
| `COUNT` | a skill count in the README or marketplace description that disagrees with `agents/claude/skills/` | fix the number |
| `SHARED` | a stale mention in the root `README.md` | nothing — list it in the PR body |
| `NOTE` | an API model no skill calls | nothing — the sync [never creates a skill](#new-models); list them in the summary |

Flags: `--model <id>` (one model, repeatable), `--save` / `--json` (snapshot then re-run offline), `--strict` (exit 1 when anything is reported). The script only reports; every edit is by hand.

**Abort conditions.** If the fetch fails, times out, or returns zero models, change nothing, say the sync did not run, and stop. A partial or empty payload must never be treated as "the API removed everything". This is the one case where the skill does less than a full sync — it is a failure to report, not a question to ask.

Fields the script does not print:

```bash
curl -s https://api-dashboard.zerogpu.ai/api/models | python3 -m json.tool
```

## 1. Correct what disagrees

Work each `PROSE` line. Each names the file, the line, what it says, and what the API has.

- **Numbers.** Write prices as the neighbouring text does — `\$0.16 / \$0.38 per 1M input/output tokens`, with the backslash the skill files and README use. Token counts in the short or long form the line already uses (`131K`, `1,048,576-token`); `262,144` becomes `262K`. Parameter counts exactly as the API writes them (`120B`, `33M`).
- **Descriptions are routing.** A skill's frontmatter `description` is what Claude matches a request against, so a wrong number there sends work to the wrong model. Correct it first, and keep its length and shape.
- **Derived claims.** Cost ratios and superlatives are not in the payload but follow from it, and the audit cannot check them. Whenever a price or context window moved, recompute every claim that depends on it from the payload's own numbers:
  - multipliers and fractions — `roughly 7x`, `about a sixteenth`, `over fifty times` — rounded the way the text already rounds; when a claim about input and output diverges, state both, as `chat-glm` does;
  - superlatives and orderings — `the most expensive model on the platform`, `the cheaper of the two 1M-context models`, `cheaper still` — true only if the payload still says so;
  - routing hints — `For a prompt that fits in 131K tokens, use chat`.

  When a whole clause stops being true, rewrite the clause rather than swapping digits, keeping the sentence's voice and length. When the grouping it relies on no longer exists (there is only one 1M-context model), drop the comparison.

The audit only checks lines that name a model or a skill, so sweep for every old value you changed:

```bash
grep -rn "1M\|131K\|\\\\\$0.07\|7x\|sixteenth\|fifty" agents/claude .claude-plugin --exclude=CHANGELOG.md
```

## 2. Follow renames

A model a skill calls that an API id extends — `deepseek-v4-flash` in the skill, `deepseek-v4-flash-0731` in the API — is the same model under a new id, provided exactly one API id extends it. The audit prints it as `RENAME` with every file under `REPLACE:`.

Replace the old id with the new one in place: the `-m` in the skill's command, its description, and its body; the README section's **Model** and **Wraps** lines, tables, examples, and the skills reference row; and any other skill that names it. Keep the skill's name, its endpoint command, and its wording. Then correct whatever values drifted with it ([loop 1](#1-correct-what-disagrees)). A rename is a **minor** bump.

## 3. Remove what is gone

A model a skill calls that the API does not return, with no single successor, is removed from the plugin in full, without asking. The audit prints every file under `REMOVE:`. There is no exemption list: a model the API does not return is not a ZeroGPU model, and a skill that calls it already fails at request time.

**The skill has another model** (`embed` with `all-minilm-l6-v2` and `bge-small-en-v1.5`): drop the gone model's option from the skill body, its argument text, and the README section and table. If it was the default, the remaining model becomes the default — in the command, the "Defaults to" sentence, and the README's **Models** line. A **patch** bump.

**The model was the skill's only model**: delete the skill. A **major** bump.

1. `git rm -r agents/claude/skills/<skill>`.
2. **`agents/claude/README.md`** — delete its `### /zerogpu-router:<skill>` section and the `---` separator after it, its row in the Skills reference table, and every Quick start or cross-reference mention. Update `all N skills`.
3. **Other skills** — every `/zerogpu-router:<skill>` pointer is rewritten without it, or deleted when the sentence only existed to point there. Check descriptions too.
4. **`.claude-plugin/marketplace.json`** — the skill count in the description, and the capability word (`follow-ups`, `moderation`) if no remaining skill provides it. The same check for `description` in `agents/claude/.claude-plugin/plugin.json`.
5. **Cascade.** When a removal leaves a list, sentence, or table naming nothing, delete it rather than leaving it empty.

## Rules

### New models

A model in the API that no skill calls gets nothing. The sync never creates a skill: a skill's name, description, arguments, and prompt are product decisions, not catalog facts. List each such model in the summary and the PR body as served by the API with no skill.

### Endpoints and flags

Never change which endpoint command a skill runs, and never add, remove, or change `-i`, `--metadata`, `usecase`, or `--raw`. A renamed model keeps its skill's endpoint. The payload's sample bodies are not evidence of routability either way.

### Never invent

API-sourced facts only: id, task, `maxTokens`, input/output price, parameter count. Architecture details (`MoE`, `13B active`, `8 of 256 experts`), language counts, benchmark claims, and provider comparisons may stay while still true, or come from `pricing.description` — never generated. Comparisons that follow from the payload's own prices are allowed. Never invent a skill, a flag, or an example output.

## 4. Verify

Verification gates the PR: nothing is pushed until all of it passes.

```bash
python3 .claude/skills/claude-model-sync/scripts/audit-models.py --strict   # expect: only NOTE and SHARED lines
claude plugin validate .
claude plugin validate ./agents/claude
```

If `claude` is not on `PATH`, run `npx -y @anthropic-ai/claude-code plugin validate` with the same arguments.

Confirm every renamed or removed id is gone from the plugin, and nothing outside scope changed:

```bash
grep -rn "<old-id>" agents/claude .claude-plugin --exclude=CHANGELOG.md
git status --short | grep -vE ' (agents/claude/|\.claude-plugin/)'   # expect: no output
```

After step 5's bump and changelog, run the same release check CI runs on the PR:

```bash
git fetch --no-tags origin main
OLD=$(git show origin/main:agents/claude/.claude-plugin/plugin.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])')
NEW=$(python3 -c 'import json; print(json.load(open("agents/claude/.claude-plugin/plugin.json"))["version"])')
TOP=$(awk '/^## /{print $2; exit}' agents/claude/CHANGELOG.md)
echo "main $OLD -> PR $NEW, CHANGELOG top: $TOP"   # expect: NEW above OLD, TOP equal to NEW
```

If a check fails, fix the cause and re-run it. If it still fails, commit nothing, open no PR, and report the failure with the command output — a broken release is worse than a stale number. CI (`claude-plugin-validate`) runs the same validation and release check on the PR.

## 5. Bump, changelog, branch, and open the PR

Once verification passes, ship it. No questions, no waiting.

**Nothing changed?** If the audit was clean apart from `NOTE` and `SHARED` lines and no file was modified, bump nothing, write no changelog, create no branch and no PR. Report "already in sync" and stop.

```bash
# 1. a fresh branch cut from up-to-date main — never commit on main
git fetch origin
BRANCH="claude-model-sync/$(date -u +%Y-%m-%d-%H%M)"
git switch --create "$BRANCH" origin/main
```

Cutting from `origin/main` makes the branch unique per run and bases the bump on the version `main` actually carries. If edits were made on another branch, carry them over (`git stash` before the switch, `git stash pop` after) and re-run the [verify](#4-verify) commands.

### Version

**Every run that changes a file bumps `version` in `agents/claude/.claude-plugin/plugin.json`** — merging the PR releases it (`docs/CLAUDE_PLUGIN_RELEASE_GUIDE.md`), and CI fails a plugin PR without a bump. Exactly one bump per run, the highest any change calls for:

| The run… | Bump |
| --- | --- |
| deleted a skill because its only model is gone | major |
| moved a skill to a renamed model id | minor |
| anything else — prices, context windows, parameter counts, cost comparisons, descriptions, a model option dropped from a skill that keeps another | patch |

Bump from `main`'s version: `2.3.0` → `2.3.1` / `2.4.0` / `3.0.0`. `plugin.json` is the only file that holds the version.

### Changelog

Add a section at the **top** of `agents/claude/CHANGELOG.md`, directly under `# Changelog`, above the current top section. Its heading is exactly `## <new version>` — CI reads the second word of the first `## ` line — and its body becomes the GitHub release notes verbatim. Never edit an older section: its numbers were true when it shipped.

Write it in the voice of the sections below it — what a user of the plugin sees, not what files moved:

```md
## <new version>

Model catalog sync: <one or two sentences on what changes for someone using the plugin — which skills now call a different model, which claims were steering routing, which skill is gone>. Skill names and outputs are unchanged apart from the notes below.

### Changed

- **`<skill>` calls `<new-id>`.** The API renamed `<old-id>`, and the old id no longer resolves. <Anything else that moved with it.>
- **`<skill>`: <field> is <now>, not <was>.** Corrected in its description, which Claude matches on, and in <other skills, README>. <What that changes — e.g. a comparison that no longer holds and was rewritten.>

### Removed

- **`<skill>`.** `<model>` is no longer served by the ZeroGPU API, so the skill failed on every call. Skill count goes from N to N-1.
```

Rules for the section:

- One bullet per user-visible change, bold lead first, `was → now` in the prose. Group several numbers for one model into one bullet.
- Only `### Changed` and `### Removed`. An empty one is deleted, not left as a heading. No `### Added` — the sync never adds a skill.
- Prices with the backslash the file already uses: `\$0.16 / \$0.38 per 1M`.
- Do not mention models that got no skill, the root README, or the audit script.

```bash
# 2. stage only what the sync touched — never `git add -A`
git add agents/claude/skills/... agents/claude/README.md .claude-plugin/marketplace.json \
        agents/claude/.claude-plugin/plugin.json agents/claude/CHANGELOG.md
git status --short          # confirm nothing unrelated is staged
```

A repo that was dirty before the run stays dirty: unrelated work is not the sync's to commit. A deleted skill is staged with `git rm -r`, so the removal lands in the commit.

```bash
# 3. commit — the repo's release-commit convention
git commit -m "$(cat <<'EOF'
claude: release v<new version> — sync models with dashboard API

<one line per change, e.g.:>
- chat-deepseek: deepseek-v4-flash -> deepseek-v4-flash-0731 (skill, README)
- chat-glm: glm-5.2 context 1M -> 262K; cost ratios recomputed (chat, chat-deepseek, README)
- embed: price $0.50 -> $0.004 per 1M input (skill, README)
- remove generate-followups: zlm-v1-followup-questions-edge no longer served
- version 2.3.0 -> 3.0.0; CHANGELOG section added

Source: https://api-dashboard.zerogpu.ai/api/models

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"

# 4. push and open the PR against main
git push -u origin "$BRANCH"
gh pr create --base main --head "$BRANCH" \
  --title "claude: release v<new version> — sync models with dashboard API" \
  --body "$(cat <<'EOF'
Automated model-catalog sync for the Claude Code plugin. The dashboard API is the source of truth; every value below was taken from it. Merging releases `zerogpu-router` v<new version> — `claude-plugin-release` tags it and publishes the CHANGELOG section below.

## Version
<old> → <new> (<patch | minor | major>: <the change that set it>)

## Corrected
| Skill | Model | Field | Was | Now |
| --- | --- | --- | --- | --- |

## Renamed
## Removed

## Not changed
- API models with no skill: <ids>
- Stale lines in the root `README.md`, which is shared with the OpenClaw plugin: <file:line — what>

## CHANGELOG
<the new section, verbatim>

## Verification
- `audit-models.py --strict` — clean apart from NOTE and SHARED lines
- `claude plugin validate .` and `claude plugin validate ./agents/claude` pass
- `plugin.json` version above `main`'s, and the top CHANGELOG section matches it

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Rules for this step:

- **Never** commit to `main`, force-push, merge the PR, or delete a branch. Opening it is the whole job; review is someone else's.
- Fill both templates with the run's actual changes. An empty section is deleted, not left as a heading.
- Each run gets its own timestamped branch. Check for an earlier sync PR still open, and if there is one, say "supersedes #N" in the new PR's body and leave the old one alone:
  ```bash
  gh pr list --state open --json number,headRefName \
    --jq '.[] | select(.headRefName | startswith("claude-model-sync/")) | "#\(.number) \(.headRefName)"'
  ```
- If the push or `gh pr create` fails — no auth, no network, protected branch — the commit still stands on the branch. Report the exact error and the branch name so it can be pushed later. Do not retry in a loop, and do not fall back to committing on `main`.

## 6. Report

One pass, no questions: values corrected, claims rewritten, models renamed, model options dropped, skills deleted, the version bump and why, API models with no skill, stale root-README lines left for the shared routes table, any claim that could not be sourced, and the PR URL (or the branch name and the exact error if the PR could not be opened).
