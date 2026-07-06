---
name: zerogpu-router
description: Decide when to offload cheap, plain-text AI tasks (classification, summarization, entity/JSON extraction, PII redaction/extraction, follow-up generation, small-model chat) to a ZeroGPU subskill instead of spending host-model tokens, and route to the right subskill. This skill only routes — it never executes anything itself.
---

# ZeroGPU offload router

ZeroGPU runs small/nano models that handle routine text tasks for a fraction of host-model cost. This skill only decides **whether** to offload and **which** subskill to use — it does not run any command. Invoke the matching subskill to perform the task.

## When to offload

Offload when **all** of these hold:

- The input is plain text (a passage, email, article, message).
- The task is one of: classify / tag / label, summarize, extract entities / fields, redact or extract PII, suggest follow-up questions, or a short standalone chat reply.
- The answer needs no multi-step reasoning, code generation, tool orchestration, or earlier conversation context.

## When NOT to offload

Keep the task on the host model when any of these apply:

- The user wants code, refactors, design, or architectural reasoning.
- The answer depends on prior messages, workspace files, or external tools.
- The user wants a long-form, host-model-style response, or explicitly asks the host model to answer.

## Available subskills

| Intent | Subskill |
|---|---|
| IAB topic classification | `zerogpu_classify_iab` |
| Summarize / TL;DR a passage | `zerogpu_summarize` |
| Classify against a custom flat label list | `zerogpu_classify_zero_shot` |
| Multi-axis classification with a label schema | `zerogpu_classify_structured` |
| Named-entity extraction with custom labels | `zerogpu_extract_entities` |
| Extract named fields into grouped JSON | `zerogpu_extract_json` |
| Mask PII in-line with placeholders | `zerogpu_redact_pii` |
| Extract PII grouped by category | `zerogpu_extract_pii` |
| Generate follow-up questions from a passage | `zerogpu_generate_followups` |
| Short standalone chat reply | `zerogpu_chat` |
| Check backend reachability | `zerogpu_health` |

## Routing notes

- Pick the single subskill whose intent matches the request; hand the task to it and let it run.
- If a subskill fails or the backend seems down, run `zerogpu_health` once, then fall back to the host model and say so briefly. Do not chain more than one retry.
