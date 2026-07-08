# OpenClaw

Install and connect ZeroGPU Router to your OpenClaw agent. The plugin ships CLI-based skills that run locally through the agent's Bash tools — all inference goes through the `zerogpu` CLI, so there's nothing to host or register.

You need a ZeroGPU API key and project ID. Grab them at [platform.zerogpu.ai](https://platform.zerogpu.ai).

## Install

```sh
# 1. Install the ZeroGPU CLI (the plugin's skills shell out to it)
npm install -g zerogpu-cli

# 2. Log in (prompts for API key `zgpu-api-…` and project ID)
zerogpu login

# 3. Install the plugin
openclaw plugins install zerogpu-openclaw-plugin
```

Pin a release: `zerogpu-openclaw-plugin@1.4.0`.

## Try it

Ask your agent in plain language — it picks the right skill and runs the `zerogpu` CLI locally. Each reply comes back with the result plus a savings line showing what the routed call cost versus the host model.

**Summarize**

```text
summarize this paragraph: Renewable energy adoption is accelerating globally, driven by falling solar and wind costs.
```

**Classify**

```text
classify this ticket as bug, feature, or question: "The export button does nothing on Safari."
```

**Redact PII**

```text
redact the PII in this before I share it: "Email Sarah Chen at sarah.chen@northwind-labs.com or call +1 415-555-0182."
```

## Advanced — install from source

The plugin lives at `agents/openclaw/plugin/` in the [zerogpu/zerogpu-router](https://github.com/zerogpu/zerogpu-router) monorepo. Install from a checkout instead of npm — use the plugin path, not the repo root:

```sh
tmpdir=$(mktemp -d)
git clone --depth 1 -b main https://github.com/zerogpu/zerogpu-router.git "$tmpdir/repo"
(cd "$tmpdir/repo/agents/openclaw/plugin" && npm ci && npm run build)
openclaw plugins install "$tmpdir/repo/agents/openclaw/plugin"
```
