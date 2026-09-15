# Releasing the `zerogpu-router` OpenClaw plugin

**Every PR that changes the plugin is a release.** It bumps the version and adds a changelog section, PR CI checks both, and merging it tags, creates the GitHub release, and publishes to **ClawHub** as the `zerogpu-router` code-plugin. You never create tags, releases, or ClawHub publishes by hand.

## 1. In your PR — bump the version and write the changelog

For any change under `agents/openclaw/` (other than the changelog itself):

- Bump `version` to the same value in both `agents/openclaw/plugin/package.json` and `agents/openclaw/plugin/openclaw.plugin.json`, then sync the lockfile:

  ```bash
  npm --prefix agents/openclaw/plugin install --package-lock-only
  ```

- Add a `## <new-version>` section at the **top** of `agents/openclaw/CHANGELOG.md` describing what users see. It becomes the GitHub release body verbatim.

Which bump to choose:

| Change                                                       | Bump    |
| ------------------------------------------------------------ | ------- |
| Bug fix, doc/wording tweak inside a skill                    | `patch` |
| New skill, new optional flag, model swap with same I/O       | `minor` |
| Skill removed/renamed, output shape changed, required flag   | `major` |

If another plugin PR merges first with the same version, you'll get a conflict in the manifests / `CHANGELOG.md`: rebase and bump again.

## 2. PR CI checks it

`openclaw-plugin-validate` on the PR:

- runs `npm ci`, `npm run build`, `npm pack --dry-run`, and the skill collision and manifest checks,
- checks `package.json`, `openclaw.plugin.json`, and `package-lock.json` carry the same version,
- if the PR changes anything under `agents/openclaw/` besides `CHANGELOG.md`, **fails** unless the `package.json` version is higher than `main`'s and the top changelog section is `## <that version>`.

Changelog-only PRs don't need a bump.

## 3. Merge — CI tags, releases, and publishes

On every push to `main` touching `agents/openclaw/`:

1. **`openclaw-plugin-validate`** builds and validates the plugin.
2. **`openclaw-plugin-release`** (`.github/workflows/openclaw-plugin-release.yml`) runs only if validate **succeeded**, against the exact commit validate checked:
   - Reads `version` from `package.json`. If a `zerogpu-openclaw-plugin--v<version>` release already exists, the version hasn't changed: **skip** (nothing is published).
   - Requires the **top** section of `agents/openclaw/CHANGELOG.md` to be `## <version>`. If it isn't, the run **fails** without tagging, releasing, or publishing.
   - Creates the annotated tag `zerogpu-openclaw-plugin--v<version>` on that commit as `github-actions[bot]` and pushes it.
   - Creates the GitHub release `zerogpu-openclaw-plugin <version>` with that changelog section as the body.
   - Builds the plugin and runs `clawhub package publish agents/openclaw/plugin --family code-plugin --owner zerogpu` (a `--dry-run` first, then the real publish) using the `CLAWHUB_TOKEN` secret.

Tag and release happen in the same workflow on purpose: a tag pushed with the default `GITHUB_TOKEN` doesn't trigger other workflows, so a separate tag-triggered release job would never run.

> The tag prefix stays `zerogpu-openclaw-plugin--v*` on purpose — it is distinct from the Claude plugin's `zerogpu-router--v*` tag, so the two release flows never collide. The published ClawHub package name is `zerogpu-router`; the git tag prefix and the package name are independent.

### When something goes wrong

- **Validate failed:** no release. Fix it and push; the next green run releases.
- **Release run failed on the changelog check:** push a commit fixing the top `## <version>` section. Changelog pushes to `main` still run validate, so the release follows.
- **Tag pushed but release creation failed:** re-run the failed `openclaw-plugin-release` run. It reuses the existing tag.
- **GitHub release created but ClawHub publish failed:** use **Re-run failed jobs** on that run, not "Re-run all jobs". A full re-run sees the release already exists and skips the publish.

## Install (for users)

```
npm install -g zerogpu-cli
zerogpu login
openclaw plugins install clawhub:zerogpu-router
```
