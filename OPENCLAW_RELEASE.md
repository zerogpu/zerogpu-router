# OpenClaw Plugin Release

Quick reference for releasing `zerogpu-openclaw-plugin`.

---

## Per-PR checklist

- Make changes under `agents/openclaw/`
- Add a new section in:
  - `agents/openclaw/CHANGELOG.md`
- Bump versions in BOTH files:
  - `agents/openclaw/plugin/package.json`
  - `agents/openclaw/plugin/openclaw.plugin.json`

Versions must match.

---

## Cutting a release

From a clean `main`, in sync with `origin/main`:

```bash
git checkout main && git pull
./openclaw-release           # patch (default)
./openclaw-release minor
./openclaw-release major
```