# OpenClaw

Use these commands in an OpenClaw terminal to install and connect ZeroGPU Router. The plugin ships CLI-based skills that run locally through the agent's Bash tools — there is no MCP server to register.

You need a ZeroGPU API key and project ID. Grab them at [platform.zerogpu.ai](https://platform.zerogpu.ai).

## 1) Install the `zerogpu` CLI

The plugin's skills shell out to this CLI:

```sh
npm install -g zerogpu-cli
```

## 2) Log in

```sh
zerogpu login
```

You'll be prompted for your API key (`zgpu-api-…`) and project ID (UUID).

## 3) Install the plugin

```sh
openclaw plugins install zerogpu-openclaw-plugin
```

Optional pin: `zerogpu-openclaw-plugin@0.1.10`.

**From GitHub** — plugin path is `agents/openclaw/plugin/` in [zerogpu/zerogpu-router](https://github.com/zerogpu/zerogpu-router) (not repo root; do not use `git:github.com/zerogpu/zerogpu-router@main` alone):

```sh
tmpdir=$(mktemp -d)
git clone --depth 1 -b main https://github.com/zerogpu/zerogpu-router.git "$tmpdir/repo"
(cd "$tmpdir/repo/agents/openclaw/plugin" && npm ci && npm run build)
openclaw plugins install "$tmpdir/repo/agents/openclaw/plugin"
```

## 4) Try it

```text
summarize this paragraph: Renewable energy adoption is accelerating globally, driven by falling solar and wind costs.
```

The agent runs the `zerogpu_summarize` skill, which executes `zerogpu summarize` locally via its Bash tool, and returns the summary plus a savings line.
