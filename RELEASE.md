# Release Guide

This repository publishes two independently useful artifacts:

- `zerogpu-mcp` from `mcp-server/`: the MCP server package and Cloudflare Worker source.
- `openclaw-package-zerogpu` from `openclaw-plugin/plugin/`: the OpenClaw plugin package and skill.

## Pre-release Checklist

1. Confirm no real credentials are committed:

   ```bash
   rg -i "(api[-_ ]?key|project[-_ ]?id|secret|token)" .
   ```

2. Run the full local release check:

   ```bash
   npm run release:check
   ```

3. If `mcp-server/config/catalog.json` changed, seed Cloudflare KV for each target environment:

   ```bash
   npm --prefix mcp-server run kv:seed:develop
   npm --prefix mcp-server run kv:seed:staging
   npm --prefix mcp-server run kv:seed:production
   ```

4. Create a GitHub release from the version tag.

Publishing a GitHub release triggers the production Cloudflare Worker deploy through `.github/workflows/deploy-prod.yml`.

## NPM Dry Runs

Use dry runs before publishing packages:

```bash
npm --prefix mcp-server pack --dry-run
npm --prefix openclaw-plugin/plugin pack --dry-run
```

## Cloudflare Secrets

The Worker expects `ZEROGPU_ORCHESTRATION_URL` as a Cloudflare secret per environment. Client credentials are not stored in the Worker; OpenClaw, Claude Code, or another MCP client sends `x-api-key` and `x-project-id` on every `/mcp` request.
