# Releasing the `zerogpu-router` plugin

**Every PR that changes the plugin is a release.** It bumps the version and adds a changelog section, PR CI checks both, and merging it tags and publishes the GitHub release. You never create tags or releases by hand.

## 1. In your PR — bump the version and write the changelog

For any change under `agents/claude/` (other than the changelog itself):

- Bump `version` in `agents/claude/.claude-plugin/plugin.json`.
- Add a `## <new-version>` section at the **top** of `agents/claude/CHANGELOG.md` describing what users see. It becomes the GitHub release body verbatim.

Which bump to choose:

| Change                                                       | Bump    |
| ------------------------------------------------------------ | ------- |
| Bug fix, doc/wording tweak inside a skill                    | `patch` |
| New skill, new optional flag, model swap with same I/O       | `minor` |
| Skill removed/renamed, output shape changed, required flag   | `major` |

If another plugin PR merges first with the same version, you'll get a conflict in `plugin.json` / `CHANGELOG.md`: rebase and bump again.

## 2. PR CI checks it

`claude-plugin-validate` on the PR:

- runs `claude plugin validate` on the marketplace and the plugin,
- if the PR changes anything under `agents/claude/` besides `CHANGELOG.md`, **fails** unless the `plugin.json` version is higher than `main`'s and the top changelog section is `## <that version>`.

Changelog-only PRs don't run validate and don't need a bump.

## 3. Merge — CI tags and releases

On every push to `main` touching `agents/claude/` or `.claude-plugin/`:

1. **`claude-plugin-validate`** validates the marketplace and plugin.
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
