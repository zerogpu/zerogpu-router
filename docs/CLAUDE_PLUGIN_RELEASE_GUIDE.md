# Releasing the `zerogpu-router` plugin

A release is **a version bump in `plugin.json` plus a matching changelog section, landed on `main`**. CI does the rest: validates, tags, and creates the GitHub release. You never create tags or releases by hand.

## 1. While you work — just update the changelog

For any change under `agents/claude/`:

- Add or extend a `## <next-version>` section at the **top** of `agents/claude/CHANGELOG.md` describing what users see. Several PRs can share one section — you don't need a new heading per PR.
- Leave `agents/claude/.claude-plugin/plugin.json` alone until you're ready to release. Merging a version bump is what triggers a release.

PR CI (`claude-plugin-validate`) only runs `claude plugin validate` on the marketplace and the plugin. It doesn't check the changelog or the version, so intermediate PRs stay unblocked.

## 2. Cut the release — bump the version

In a PR, bump `version` in `agents/claude/.claude-plugin/plugin.json` and make sure the top section of `agents/claude/CHANGELOG.md` is `## <new-version>`. Merge it. That's the whole release step.

Which bump to choose:

| Change                                                       | Bump    |
| ------------------------------------------------------------ | ------- |
| Bug fix, doc/wording tweak inside a skill                    | `patch` |
| New skill, new optional flag, model swap with same I/O       | `minor` |
| Skill removed/renamed, output shape changed, required flag   | `major` |

## 3. CI tags and releases

On every push to `main` touching `agents/claude/` or `.claude-plugin/`:

1. **`claude-plugin-validate`** validates the marketplace and plugin. That's its only job.
2. **`claude-plugin-release`** (`.github/workflows/claude-plugin-release.yml`) runs only if validate **succeeded**, against the exact commit validate checked:
   - Reads `version` from `plugin.json`. If a `zerogpu-router--v<version>` release already exists, the version hasn't changed: **skip**.
   - Requires the **top** section of `agents/claude/CHANGELOG.md` to be `## <version>`. If it isn't, the run **fails** without tagging or releasing.
   - Creates the annotated tag `zerogpu-router--v<version>` on that commit as `github-actions[bot]` and pushes it.
   - Creates the GitHub release `zerogpu-router <version>` with that changelog section as the body.

Tag and release happen in the same workflow on purpose: a tag pushed with the default `GITHUB_TOKEN` doesn't trigger other workflows, so a separate tag-triggered release job would never run.

### When something goes wrong

- **Validate failed:** no release. Fix it and push; the next green run releases.
- **Release run failed on the changelog check:** push a commit fixing the top `## <version>` section. Changelog-only pushes to `main` still run validate, so the release follows.
- **Tag pushed but release creation failed:** re-run the failed `claude-plugin-release` run. It reuses the existing tag.

## Install (for users)

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```
