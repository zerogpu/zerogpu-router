# Releasing the `zerogpu-router` OpenClaw plugin

How to cut a release. The whole flow is two things: **write the changelog** (by hand, per release), then **run one script**. The plugin publishes to **ClawHub** as the `zerogpu-router` code-plugin.

## 1. While you work — just update the changelog

For any change under `agents/openclaw/`:

- Add or extend a `## <next-version>` section in `agents/openclaw/CHANGELOG.md` describing what users see. Several PRs can share one section — you don't need a new heading per PR.
- **Do not** hand-bump `agents/openclaw/plugin/package.json` or `openclaw.plugin.json`. The release script bumps both (and the lockfile) for you.

PR CI (`openclaw-plugin-validate`) runs `npm ci`, `npm run build`, checks `package.json` and `openclaw.plugin.json` versions match, and — on PRs — that the changelog was updated when plugin files changed.

## 2. Cut the release — run the script

From a clean `main` that's in sync with `origin/main`:

```bash
git checkout main && git pull
scripts/openclaw-release          # patch (default)
scripts/openclaw-release minor
scripts/openclaw-release major
```

Run it from anywhere in the repo — it resolves paths against the git root.

The script, in order:

1. Picks the bump (the `patch|minor|major` argument; defaults to `patch`).
2. **Preconditions** — needs `jq` + `npm`, a clean tree, you on `main`, and `main` level with `origin/main`.
3. Computes the next version from `package.json` and forms the tag `zerogpu-openclaw-plugin--v<new>`; aborts if that tag already exists locally or on `origin`.
4. **Requires** a matching `## <new-version>` heading in `agents/openclaw/CHANGELOG.md`. Missing → it stops before changing anything, so add the section and re-run.
5. Bumps `package.json` + `openclaw.plugin.json`, syncs `package-lock.json`, commits as `openclaw: release v<new>`, and pushes to `origin/main`.
6. Tags `zerogpu-openclaw-plugin--v<new>` and pushes the tag.

> The tag prefix stays `zerogpu-openclaw-plugin--v*` on purpose — it is distinct from the Claude plugin's `zerogpu-router--v*` tag, so the two release workflows never collide. The published ClawHub package name is `zerogpu-router`; the git tag prefix and the package name are independent.

Which bump to choose:

| Change                                                       | Bump    |
| ------------------------------------------------------------ | ------- |
| Bug fix, doc/wording tweak inside a skill                    | `patch` |
| New skill, new optional flag, model swap with same I/O       | `minor` |
| Skill removed/renamed, output shape changed, required flag   | `major` |

## 3. The GitHub release + ClawHub publish happen on their own

`openclaw-plugin-release` (`.github/workflows/openclaw-plugin-release.yml`) fires on the `zerogpu-openclaw-plugin--v*` tag:

- verifies `package.json` on the tagged commit matches the tag version,
- slices the matching `## <version>` section out of `agents/openclaw/CHANGELOG.md` and creates the GitHub release with that section as the body,
- builds the plugin and runs `clawhub package publish agents/openclaw/plugin --family code-plugin --owner zerogpu` (a `--dry-run` first, then the real publish) using the `CLAWHUB_TOKEN` secret.

No manual `gh release create` or `clawhub` publish. If it fails, fix the cause and re-tag rather than releasing by hand.

## Install (for users)

```
npm install -g zerogpu-cli
zerogpu login
openclaw plugins install clawhub:zerogpu-router
```
