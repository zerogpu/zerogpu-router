# Claude Plugin Release

Quick reference for cutting a `zerogpu-router` release.

## Per-PR

- Make your changes under `agents/claude/`.
- Add a `## <next-version>` section to `agents/claude/CHANGELOG.md` describing what shipped.
- **Do not** bump `agents/claude/.claude-plugin/plugin.json` — `./claude-release` does that at release time.

`claude-plugin-validate` enforces:

- `claude plugin validate` passes on both the marketplace and `agents/claude/`.
- `agents/claude/CHANGELOG.md` was modified when other `agents/claude/**` files changed.

## Cutting the release

From a clean `main`, in sync with `origin/main`:

```bash
git checkout main && git pull
./claude-release           # patch (default)
./claude-release minor
./claude-release major
```

The script:

1. Reads the current version from `plugin.json` and computes the next one based on `patch|minor|major`.
2. Warns if no `## <new-version>` heading exists in `agents/claude/CHANGELOG.md`.
3. Bumps `plugin.json` in place, commits as `claude: release v<new>`, pushes to `origin/main`.
4. Runs `claude plugin tag --push` from `agents/claude/`, which derives the tag name from the manifest, validates the plugin, cross-checks `plugin.json` against the marketplace entry, and pushes `zerogpu-router--v<new>`.

Prereqs: `jq`, and the Claude Code CLI (`npm install -g @anthropic-ai/claude-code`).

## What runs after the tag

`claude-plugin-release` (`.github/workflows/claude-plugin-release.yml`) fires on the `zerogpu-router--v*` tag push:

- verifies `plugin.json` version matches the tag,
- slices the matching `## <version>` section out of `agents/claude/CHANGELOG.md`,
- creates the GitHub release with that section as the body.

No manual `gh release create` step.

## Install (for users)

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```
