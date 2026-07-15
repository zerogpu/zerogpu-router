# Releasing the `zerogpu-router` plugin

How to cut a release. The whole flow is two things: **write the changelog** (by hand, per release), then **run one script**.

## 1. While you work — just update the changelog

For any change under `agents/claude/`:

- Add or extend a `## <next-version>` section in `agents/claude/CHANGELOG.md` describing what users see. Several PRs can share one section — you don't need a new heading per PR.
- **Do not** touch `agents/claude/.claude-plugin/plugin.json`. The release script bumps the version for you.

PR CI (`claude-plugin-validate`) only runs `claude plugin validate` on the marketplace and the plugin. It no longer checks the changelog, so intermediate PRs stay unblocked — the changelog is enforced once, at release time (step 2).

## 2. Cut the release — run the script

From a clean `main` that's in sync with `origin/main`:

```bash
git checkout main && git pull
scripts/claude-release          # prompts: 1) patch  2) minor  3) major
scripts/claude-release minor    # or pass the bump directly
scripts/claude-release major
```

Run it from anywhere in the repo — it resolves paths against the git root.

The script, in order:

1. Picks the bump (interactive menu, or the `patch|minor|major` argument).
2. **Preconditions** — needs `jq` + the Claude CLI, a clean tree, you on `main`, and `main` level with `origin/main`.
3. Computes the next version from `plugin.json` and forms the tag `zerogpu-router--v<new>`; aborts if that tag already exists.
4. **Requires** a matching `## <new-version>` heading in `agents/claude/CHANGELOG.md`. Missing → it stops before changing anything, so add the section and re-run.
5. Bumps `plugin.json`, commits as `claude: release v<new>`, and pushes to `origin/main`.
6. Runs `claude plugin tag --push` from `agents/claude/` — validates the plugin, cross-checks `plugin.json` against the marketplace entry, and pushes the tag.

Which bump to choose:

| Change                                                       | Bump    |
| ------------------------------------------------------------ | ------- |
| Bug fix, doc/wording tweak inside a skill                    | `patch` |
| New skill, new optional flag, model swap with same I/O       | `minor` |
| Skill removed/renamed, output shape changed, required flag   | `major` |

## 3. The GitHub release happens on its own

`claude-plugin-release` (`.github/workflows/claude-plugin-release.yml`) fires on the `zerogpu-router--v*` tag:

- verifies `plugin.json` on the tagged commit matches the tag version,
- slices the matching `## <version>` section out of `agents/claude/CHANGELOG.md`,
- creates the GitHub release with that section as the body.

No manual `gh release create`. If it fails, fix the cause and re-tag rather than releasing by hand.

## Install (for users)

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```
