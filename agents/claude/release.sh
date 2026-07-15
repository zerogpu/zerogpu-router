#!/usr/bin/env bash
# agents/claude/release.sh [patch|minor|major]
#
# Bumps agents/claude/.claude-plugin/plugin.json, commits, pushes the commit to
# origin/main, then hands off to `claude plugin tag --push` (the official CLI)
# to create and push the spec-conformant tag `zerogpu-router--v<new-version>`
# — see docs/plugin-dependencies.md.
#
# Run from anywhere in the repo; paths resolve against the git root.
# Default bump: patch.

set -euo pipefail

BUMP="${1:-}"
if [ -z "$BUMP" ]; then
  echo "Select release type:"
  echo "  1) patch"
  echo "  2) minor"
  echo "  3) major"
  read -r -p "Enter choice [1-3] (default 1): " choice
  case "$choice" in
    ""|1|patch) BUMP="patch" ;;
    2|minor)    BUMP="minor" ;;
    3|major)    BUMP="major" ;;
    *)
      echo "error: invalid choice '$choice'" >&2
      exit 2
      ;;
  esac
fi
case "$BUMP" in
  patch|minor|major) ;;
  *)
    echo "error: bump must be one of patch|minor|major (got '$BUMP')" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PLUGIN_JSON="agents/claude/.claude-plugin/plugin.json"
CHANGELOG="agents/claude/CHANGELOG.md"

# Preconditions.
command -v jq >/dev/null     || { echo "error: jq is required" >&2; exit 1; }
command -v claude >/dev/null || { echo "error: claude CLI is required (npm install -g @anthropic-ai/claude-code)" >&2; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty — commit or stash before releasing" >&2
  git status --short >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "error: must be on 'main' to release (currently on '$CURRENT_BRANCH')" >&2
  exit 1
fi

git fetch --no-tags origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "error: local main is not in sync with origin/main" >&2
  echo "  local:  $LOCAL" >&2
  echo "  remote: $REMOTE" >&2
  exit 1
fi

# Compute new version.
CURRENT="$(jq -r .version "$PLUGIN_JSON")"
IFS='.' read -r MAJOR MINOR PATCH <<<"$CURRENT"
case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac
NEW="${MAJOR}.${MINOR}.${PATCH}"
TAG="zerogpu-router--v${NEW}"

echo "Releasing claude plugin: $CURRENT -> $NEW  (tag: $TAG)"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi
if git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists on origin" >&2
  exit 1
fi

# Require a CHANGELOG heading for the new version. This section becomes the
# GitHub release body verbatim, so releasing without it is never correct — fail
# hard here rather than pushing a commit/tag the release workflow would reject.
if ! grep -Eq "^##[[:space:]]+${NEW}([[:space:]]|$)" "$CHANGELOG"; then
  echo "error: no '## $NEW' heading found in $CHANGELOG" >&2
  echo "  Add a '## $NEW' section describing what shipped, commit it, then re-run." >&2
  exit 1
fi

# Bump plugin.json in place.
tmp="$(mktemp)"
jq --arg v "$NEW" '.version = $v' "$PLUGIN_JSON" >"$tmp"
mv "$tmp" "$PLUGIN_JSON"

git add "$PLUGIN_JSON"
git commit -m "claude: release v${NEW}"

echo "Pushing commit to origin/main..."
git push origin main

echo "Tagging via 'claude plugin tag --push' (validates plugin and pushes tag)..."
( cd agents/claude && claude plugin tag --push )

echo "Released $TAG."
