# Introducing ZeroGPU Router

**Team ZeroGPU**  
**Team ZeroGPU**  
·  
May 13, 2026  
·  
3 min read

![ZeroGPU dashboard showing agents, usage, and routed-call savings](../assets/zerogpu-dashboard.gif)

*ZeroGPU platform: connect agents, watch usage, and see savings from routed workloads.*

## The problem with agent bills

Personal AI stacks like **OpenClaw** and **Claude Code** are powerful because they can call frontier models for everything. That convenience comes with a cost: **summaries, classifications, extractions, and formatting** often get handled by the same expensive model as deep reasoning and code generation. The line items blur together, and the monthly total is a surprise.

Estimating the cost of a single “small” request is hard when your agent does not distinguish trivial work from heavy work.

## What ZeroGPU Router does

**ZeroGPU Router** is a cost-aware routing layer for agents that speak **MCP (Model Context Protocol)**. Instead of burning frontier tokens on repetitive text work, your agent calls **task-specific tools** — summarize, classify, redact PII, extract JSON, generate follow-ups, short chat, and more — backed by **small and nano models** that are dramatically cheaper per call.

You keep your existing reasoning model for the hard problems. For plain-text chores that fit the tool contracts, the agent routes work to ZeroGPU.

Here is what that looks like in practice:

- **Simple workloads** (classification, summarization, extraction, PII handling, follow-ups) map to dedicated `zerogpu_*` tools and smaller models.
- **Complex work** (multi-step reasoning, code generation, anything that needs full context) stays on your frontier model — the Router does not pretend to replace that.
- **Everything is measurable** — routed calls return usage and a real **`savings_usd`** signal so you can see the impact in the product, not only on the invoice.

## How it works

ZeroGPU Router exposes a **hosted MCP server** at `https://mcp.zerogpu.ai/mcp`. Your agent registers it like any other MCP provider (API key + project id on the wire). The **OpenClaw** integration ships as the npm package **`zerogpu-openclaw-plugin`**, which bundles routing guidance so the agent learns **when** to call which tool. **Claude Code** users get a parallel path: MCP registration plus the **`zerogpu-router`** marketplace plugin.

The flow is intentional rather than magical: the skill and plugin describe eligible tasks; the agent invokes MCP tools when the user intent matches. That keeps behavior predictable and debuggable.

## Your keys, your dashboard

We think **transparent routing** matters as agents become default interfaces to work. You should see **which** tool ran, **which** model served it, and **what** it saved — not a black box.

Sign in at **[platform.zerogpu.ai](https://platform.zerogpu.ai)** to create projects and API keys, connect agents (OpenClaw and Claude), and watch usage and savings over time. The [agent integrations and plugin code](https://github.com/zerogpu/zerogpu-router) in this repository are **open source (MIT)** so you can inspect how the client side is wired.

## Real-time cost visibility

Beyond cheaper tool calls, ZeroGPU Router is built for **visibility**:

- **Per-call signals** — model, latency, and savings metadata travel with responses.
- **Dashboard views** — usage and savings trends live where you manage keys and agents.
- **Agent inventory** — see how OpenClaw and Claude setups map to real connections.

That feedback loop is how you turn “we should use smaller models sometimes” into a default behavior.

## Getting started

Roughly **minutes**, not hours:

1. Create a project and grab an API key + project id at **[platform.zerogpu.ai](https://platform.zerogpu.ai)**.
2. **OpenClaw:** install the plugin from npm, then register MCP and restart the gateway. For example:

```sh
tmpdir=$(mktemp -d) && cd "$tmpdir" && npm pack zerogpu-openclaw-plugin@0.1.10 && tar -xzf zerogpu-openclaw-plugin-*.tgz && cd package && openclaw plugins install ./
```

```sh
openclaw mcp set zerogpu '{
  "url": "https://mcp.zerogpu.ai/mcp",
  "transport": "streamable-http",
  "headers": {
    "x-api-key": "<your-api-key>",
    "x-project-id": "<your-project-id>"
  }
}'
```

```sh
openclaw gateway restart
```

3. **Claude Code:** add the MCP server and install the **`zerogpu-router`** plugin from the marketplace — see the [Claude setup guide](../agents/claude/README.md) in this repo.

Full copy-paste flows also live in the [root README](../README.md).

## What is next

We are early. On the roadmap:

- **Broader task coverage** and tighter quality tiers where it makes sense.
- **Deeper dashboard analytics** so teams can attribute savings by agent and workflow.
- **Sharper defaults** in the routing skill as we learn from production traffic.

We would love your feedback. Open an issue or discussion on **[GitHub](https://github.com/zerogpu/zerogpu-router)**, or reach us at **hello@zerogpu.ai**.
