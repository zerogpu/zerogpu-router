# OpenClaw Integration

Use ZeroGPU Router with your OpenClaw agent to route routine AI tasks to small models and cut inference costs. This page is a quick entry point — see the plugin README for the full guide.

## Quick start

Get an API key at [platform.zerogpu.ai](https://platform.zerogpu.ai), then:

```sh
npm install -g zerogpu-cli                        # the CLI the skills shell out to
zerogpu login                                     # prompts for your API key
openclaw plugins install clawhub:zerogpu-router
```

## Try it

Ask your agent in plain language — it picks the right skill and runs the `zerogpu` CLI locally:

```text
summarize this: Team, quick recap of today's sync. We agreed to push the mobile
checkout redesign to the March release because the payments integration slipped a
sprint. QA flagged two blocker bugs on Android that engineering will prioritize
this week. Marketing still wants the new pricing page live before the end of the
quarter, so we will revisit scope on Thursday. Please update your tickets before
standup tomorrow.
```

Reply:

```text
mobile checkout redesign pushed to march release, payments integration slipped a
sprint. qa flagged two android blocker bugs, engineering to fix this week.
marketing wants pricing page live by end of quarter, scope revisited thursday.
update tickets before standup.

model: llama-3.1-8b-instruct-fast · 78 tokens in / 41 out
💰 ZeroGPU savings so far: $2.14 (18,730 Claude tokens offloaded)
```

## Full documentation

See [./plugin/README.md](./plugin/README.md) — the single source of truth for skills, examples, and configuration.

## Notes

- No additional infrastructure or services required.
- Skills run locally through the `zerogpu` CLI.
