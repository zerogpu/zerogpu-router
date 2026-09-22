# Changelog

## 3.2.0

Model catalog sync against the dashboard API. The API stopped serving `deepseek-v4-flash-0731`, so `chat-deepseek` is gone — every call it made already failed — and four models the API serves had no skill calling them, so four chat skills are new. `chat-deepseek-v4-1-flash` was also advertising roughly twice its real price, which steered Claude away from it: it is one of the cheapest long-context options on the platform, not the pricier one. Skill names and outputs are unchanged apart from the notes below.

### Added

- **`chat-glm-5-3-flash`.** Calls `glm-5.3-flash`, Z.ai's efficient open-weight model for coding and long-horizon agent tasks, whose hybrid sparse and linear attention holds a 1,048,576-token context with function calling and adjustable reasoning effort. At \$0.10 / \$0.35 per 1M input/output tokens it is the cheapest of the three 1M-context models — about an eleventh of `chat-glm` on input and a tenth on output — and it takes over the long-context coding pointers `chat-deepseek` used to carry.
- **`chat-gpt-4-1-mini`.** Calls `gpt-4.1-mini`, OpenAI's fast, cost-efficient GPT-4.1 model, strong at instruction following and tool calling across a 1,047,576-token context at low latency. At \$0.40 / \$1.60 per 1M input/output tokens it is the priciest of the three 1M-context models, still about a third of `chat-glm` on input and under half on output.
- **`chat-gpt-5-6-luna`.** Calls `gpt-5.6-luna`, the cost-optimized model of OpenAI's GPT-5.6 family, with adjustable reasoning effort, function calling, and structured outputs over a 272,000-token context. \$0.20 / \$1.20 per 1M input/output tokens, for cost-sensitive high-volume work that does not fit in `chat`'s 131K window.
- **`chat-gpt-5-4-nano`.** Calls `gpt-5.4-nano`, the most cost-efficient model in OpenAI's GPT-5.4 family, built for high-volume and latency-sensitive work — classification, extraction, routing, sub-agent tasks — with function calling and structured outputs over a 400,000-token context. \$0.20 / \$1.25 per 1M input/output tokens, matching `chat-gpt-5-6-luna` on input over a larger window.
- Skill count goes from 23 to 27 with these four — 24 to 27 net of the removal below.

### Changed

- **`chat-deepseek-v4-1-flash`: \$0.14 / \$0.57 per 1M input/output tokens, not \$0.30 / \$1.20.** Corrected in its description, which Claude matches on, and in the README. It is no longer "the pricier of the two 1M-context models" but the middle of three: about an eighth of `chat-glm` on input and a sixth on output, and roughly half again as much as `chat-glm-5-3-flash`.
- **`chat` and `chat-glm` point past 131K and 262K at the new long-context skills.** Both used to send overflow to `chat-deepseek`; they now name `chat-glm-5-3-flash` and `chat-deepseek-v4-1-flash`, which each hold four times `chat-glm`'s context. `chat-glm`'s own numbers are unchanged — 753B, a 262,144-token context, \$1.10 / \$3.50 per 1M input/output tokens, still the most expensive model on the platform.

### Removed

- **`chat-deepseek`.** `deepseek-v4-flash-0731` is no longer served by the ZeroGPU API, so the skill failed on every call. For coding and agentic work at a 1M-token context, use `chat-glm-5-3-flash` or `chat-deepseek-v4-1-flash`. Skill count goes from 24 to 23 before the additions above.

## 3.1.0

Model catalog sync against the dashboard API. Three models the API serves had no skill calling them, so three skills are new: `chat-deepseek-v4-1-flash` for the V4.1 Flash line, `moderate-llama` for Meta's Llama Guard safety classifier, and `extract-signals` for one-call contextual enrichment. Every price, context window, and parameter count the plugin already stated still matches what the API serves, and `chat-deepseek` remains the cheaper of the two 1M-context models. Skill names and outputs are unchanged apart from the notes below.

### Added

- **`chat-deepseek-v4-1-flash`.** Calls `deepseek-v4.1-flash`, a sparse MoE model on DeepSeek's Causal Encoder-Decoder architecture (8B active on input, 16B on output) with function calling and a higher-effort reasoning mode. Same 1,048,576-token context as `chat-deepseek`, at \$0.30 / \$1.20 per 1M input/output tokens — roughly twice `chat-deepseek` on input and three times on output, so `chat-deepseek` stays the default for ordinary coding and agentic work.
- **`moderate-llama`.** Calls `llama-guard-4-12b`, Meta's dense 12B safety classifier derived from Llama 4 Scout, which returns a safe/unsafe verdict with the policy categories a violation falls under. A 163,840-token context at \$0.18 / \$0.18 per 1M input/output tokens, for passages and transcripts too long for `moderate`'s 800-token window; `moderate` stays cheaper and still returns OpenAI's 13-category envelope.
- **`extract-signals`.** Calls `zlm-v1-signal-extract`, an 80M model that turns free text into topics, keywords, intent, and other contextual attributes in a single call, for enrichment, contextual targeting, agent routing, and analytics pipelines. A 400-token context at \$0.02 / \$0.05 per 1M input/output tokens.
- Skill count goes from 21 to 24.

## 3.0.1

Model catalog sync against the dashboard API. Every price, context window, and parameter count the plugin states still matches what the API serves; the one claim that no longer held was `chat-deepseek`'s, which called itself the only 1M-context model on the platform. The API now serves a second one, so the line says "the cheaper of the two" again — it is still the 1M-context model this plugin routes to. Skill names and outputs are unchanged apart from the note below.

### Changed

- **`chat-deepseek`: `deepseek-v4-flash-0731` is the cheaper of the two 1M-context models, not the only one.** Corrected in the skill body and the README. Its own numbers are unchanged — \$0.16 / \$0.38 per 1M input/output tokens, a 1M-token context, roughly a seventh of `chat-glm` on input and a ninth on output — and it remains the skill to reach for when the input is too large for `chat`.

## 3.0.0

Model catalog sync against the dashboard API. `generate-followups` is gone — the model behind it is no longer served — and `chat-deepseek` now calls the version-pinned `deepseek-v4-flash-0731`. Several numbers the chat skills advertise were wrong enough to steer Claude to the wrong model: `chat-glm` claimed a 1M-token context it no longer has (it is 262K, a quarter of `chat-deepseek`'s), and `chat-deepseek` claimed a price roughly half its real one. Embeddings are far cheaper than the plugin said. Skill names and outputs are unchanged apart from the notes below.

### Changed

- **`chat-deepseek` calls `deepseek-v4-flash-0731`.** The API renamed `deepseek-v4-flash`, and the old id no longer resolves. Its price is \$0.16 / \$0.38 per 1M input/output tokens, not \$0.07 / \$0.14, so it is no longer "about a sixteenth" of `chat-glm` — it is roughly a seventh on input and a ninth on output. It is also now the only 1M-context model on the platform, so the "cheaper of the two" framing is gone, and `chat` is no longer cheaper across the board: the two are within a cent on input and `chat` costs over half again as much on output.
- **`chat-glm`: the context window is 262K tokens, not 1M.** Corrected in its description, which Claude matches on, and in `chat`, `chat-deepseek`, and the README. `chat-deepseek` now holds four times as much, so `chat-glm` is no longer the largest context on the platform — only the most capable and still the most expensive. Requests too big for 262K should go to `chat-deepseek`.
- **`chat`: `gpt-oss-120b` is 120B parameters, not 117B.** Corrected in its description and the README.
- **`chat-qwen`: `qwen3-30b-a3b-fp8` is 30B parameters, not 30.5B.** Corrected in its description and the README.
- **`embed`: both models cost \$0.004 per 1M input tokens, not \$0.50.** `all-minilm-l6-v2` also takes a 512-token window, not 256, and `bge-small-en-v1.5` is 33M parameters, not 33.4M. The two windows now match, so a longer chunk is no longer a reason to pick `bge-small-en-v1.5` over the default; English retrieval and ranking quality still are.

### Removed

- **`generate-followups`.** `zlm-v1-followup-questions-edge` is no longer served by the ZeroGPU API, so the skill failed on every call. Skill count goes from 22 to 21.

## 2.3.0

The plugin no longer breaks when the `zerogpu` CLI changes its models. Every inference skill now calls one of the CLI's model-agnostic endpoint commands, added in `zerogpu-cli` 3.8.0, and names its model itself, so a model the CLI adds, renames, or drops from a per-task command no longer changes what these skills send. Skill names are unchanged, and so is every skill's output apart from the notes below. `signin`, `status`, and `cost-savings` still wrap `zerogpu login`, `zerogpu status`, and `zerogpu cost_savings`.

### Changed

- **17 skills call `zerogpu chat_completions -m <model>`:** `chat`, `chat-liquid`, `chat-thinking`, `chat-qwen`, `chat-deepseek`, `chat-glm`, `summarize`, `classify-iab`, `classify-iab-enriched`, `classify-domain`, `classify-zero-shot`, `classify-structured`, `extract-entities`, `extract-json`, `extract-pii`, `redact-pii`, and `generate-followups`. Chat Completions serves every one of these models, including the ones some CLI commands send to `/v1/responses`, so one endpoint covers them all. Checked against the live API before the switch: `classify-iab`, `classify-iab-enriched`, `classify-domain`, `generate-followups`, `redact-pii`, `extract-pii`, `extract-entities`, `extract-json`, and `classify-structured` print output identical to the CLI commands they used to wrap.
- **`moderate` calls `zerogpu moderations` and `embed` calls `zerogpu embeddings`.** Their models are not served on Chat Completions (`400 Model not supported`). This fixes the 2.2.0 known issue: both skills failed with an unknown-command error because the CLI never shipped `moderate` or `embed`. They work now.
- **`summarize`** sends the same system prompt as `zerogpu summarize`, through `-i`.
- **`chat-thinking`** prints the full response (`--raw`), and Claude shows the reasoning, then the answer. On Chat Completions the reasoning is a separate field rather than part of the text.
- **`redact-pii`** now tells Claude the output is JSON and to lead with `redacted_text`. The output itself is unchanged; the old wording described it as plain text.
- **The input reaches the CLI on stdin** for every skill that takes plain text, rather than as a command-line argument, so very large prompts to the 1M-context models no longer risk the OS argument-length limit.
- **`classify-zero-shot`, `classify-structured`, `extract-entities`, `extract-json`, and `embed` have Claude run the command.** Their options now travel in the request's `metadata` or system message, and the gliner models reject a request whose `metadata` lacks an exact `usecase`. A pre-run command built from the raw arguments could not guarantee that: in testing, an auto-invoked `extract-entities` sent no `usecase` and failed. These five skills now show Claude the exact command — `usecase` included — and Claude fills in the labels, schema, or model from the request and runs it. Their arguments are unchanged: `-l`, `--labels`, `-t`, `-s`, and `-m` still work, and so do plain words (`labels: person, location`).
- **`classify-zero-shot` sends its labels as a `[a, b, c]` system message**, which is the only place the model reads them on Chat Completions. The old argument hint advertised a `-t` threshold that the CLI never accepted for zero-shot; it is gone.
- **The README's illustrative outputs for `classify-iab`, `classify-zero-shot`, `classify-structured`, `extract-entities`, `extract-json`, `extract-pii`, `redact-pii`, and `moderate`** now show the real response shapes. Several predated the models' current output.

### Removed

- **`extract-pii` no longer takes `-t` or `-c`.** It takes only the text and always sends the old defaults, threshold `0.5` and categories `identity,contact`. On this endpoint the model returned the same entities whatever `categories` held.
- **The chat skills no longer advertise `-i`.** The prompt reaches the CLI through a quoted heredoc, so an `-i` in the arguments was never a flag: it became part of the prompt. The descriptions, argument hints, and README now drop it rather than promise it.

### Requires

- `zerogpu-cli` >= 3.8.0 (`npm install -g zerogpu-cli@latest`). On an older CLI every inference skill fails with `error: unknown command 'chat_completions'` (or `'moderations'` / `'embeddings'`).

### Known issues

- **`chat-thinking` was not verified live.** `LFM2.5-1.2B-Thinking` returned `500` on both `/v1/responses` and `/v1/chat/completions` throughout testing, so the new reasoning-then-answer handling has not been checked against a real response.
- **`chat-qwen` can come back empty.** `qwen3-30b-a3b-fp8` sometimes spends its whole completion budget on reasoning and returns no content, which prints `Response did not contain any message content.` The old `zerogpu chat -m qwen3-30b-a3b-fp8` fails the same way on the same prompts.

## 2.2.1

Maintenance release: the plugin now releases itself from CI. **No skill, model, or output changes.** All 22 skills behave exactly as they do in 2.2.0.

This is also the first release cut by the new workflow, so it doubles as its end-to-end test.

### Changed

- **Releases are automatic.** `claude-plugin-release` no longer waits for a hand-pushed tag. It runs after `claude-plugin-validate` passes on `main`, and when `plugin.json` carries a version with no GitHub release yet and the top `CHANGELOG.md` section matches it, it creates the `zerogpu-router--v<version>` tag on the validated commit and publishes the release with that section as the body. A version that is already released is skipped; a changelog that does not match fails the run without tagging.
- **Every plugin PR is a release.** `claude-plugin-validate` now fails a PR that changes anything under `agents/claude/` unless it bumps `version` in `plugin.json` above `main`'s and puts the matching `## <version>` section at the top of the changelog. Changelog-only PRs are exempt.
- **`scripts/claude-release` removed.** Bumping, tagging, and pushing no longer happen on a laptop.
- **`claude-plugin-validate`** now also runs on changelog-only pushes to `main`, so fixing a mismatched changelog heading still reaches the release workflow.
- `docs/CLAUDE_PLUGIN_RELEASE_GUIDE.md` rewritten for the new flow, including what to do when a run fails.

## 2.2.0

Two skills for capabilities the platform has been serving that neither plugin exposed: content moderation and text embeddings. Skill count goes from 20 to 22.

Both models are routable only on their own endpoints, which is why they needed skills of their own rather than a flag on an existing one: a `/responses` call with either returns `400 model_not_found`.

### Added

- **`moderate`** wraps `zerogpu moderate`. Screens text against OpenAI's 13 safety categories via `zlm-v1-moderation-edge` (86M params, \$0.02 / \$0.05 per 1M input/output tokens) and returns the native moderations envelope — a `flagged` verdict, per-category booleans, and calibrated `category_scores` — so it drops into any pipeline written against `omni-moderation-latest`. In ZeroGPU's [published benchmarks](https://zerogpu.ai/benchmarks/moderation-edge) it beats omni-moderation on the binary safe/unsafe call and on 9 of 13 categories. The skill tells Claude to report the verdict and only the categories that came back true, without restating the flagged text, and to run the check even when the passage is unpleasant — reporting a flag is the point of the skill, not a reason to decline it.
- **`embed`** wraps `zerogpu embed`. Turns text into a 384-dimensional vector for semantic search, RAG retrieval, clustering, and deduplication. Defaults to `all-minilm-l6-v2` (22.7M params, 256-token window), the general-purpose choice for short chunks; `-m bge-small-en-v1.5` (33.4M params, 512-token window) is tuned for English retrieval and is the one to reach for when chunks run long or ranking quality is the bottleneck. Both cost \$0.50 per 1M input tokens and bill nothing on output, and both return the same vector width, so they are interchangeable in an existing index. The skill explicitly tells Claude not to print 384 floats into the conversation unless you ask for them.

### Changed

- **The glm-5.2 cost comparison was wrong in four places, and it was steering routing.** `gpt-oss-120b` was repriced to \$0.15 / \$0.60 per 1M, but these skills still quoted \$0.03 / \$0.10 and told Claude that `chat-glm` costs "roughly 20x" `chat`. At the real prices it is about 7x on input and 6x on output. That multiplier is not decoration: it sits in the bodies of `chat` and `chat-glm` — and in `chat-glm`'s `description`, which is what Claude matches on — precisely to push work down to the cheaper model, so a 3x-inflated figure was distorting the choice in both directions. Corrected in both skills, the README's cost line, and the skills reference table. The neighbouring claims were re-derived and both still hold: glm-5.2 is still over 50x the 1.2B edge models (\$1.10 against \$0.02), and `chat-deepseek` is still roughly a sixteenth of `chat-glm` (\$0.07 against \$1.10).

### Known issues

- **Neither new skill works until the CLI ships the commands.** `zerogpu moderate` and `zerogpu embed` do not exist in any published `zerogpu-cli` release, including 3.7.0; both skills fail with an unknown-command error until they do. This is the same shape as `chat-deepseek` in 2.1.0, which shipped against a model the API had not enabled yet and started working untouched. The assumed surface is the text as the first positional argument, plus `-m` on `embed` for the model, matching `zerogpu chat`. If the CLI lands different names or flags, only the two `SKILL.md` files change.

### Requires

- `zerogpu-cli` >= the release that adds `moderate` and `embed`. Every other skill in this plugin is unaffected and keeps working on 3.7.0.

## 2.1.0

Two skills for the open-weight models the docs catalog gained, both with a 1,048,576-token context window. Skill count goes from 18 to 20.

The reason to care about either is size: `chat` tops out at a 131,072-token context, and until now nothing here went past it.

### Added

- **`chat-glm`** wraps `zerogpu chat -m glm-5.2`. A 753B MoE flagship (8 of 256 experts per token) with a 1M-token context, for whole repositories, book-length documents, and long agent transcripts. It is the most capable model on the platform and the most expensive by a wide margin: \$1.10 / \$3.50 per 1M input/output tokens, against \$0.03 / \$0.10 for `chat` and \$0.02 / \$0.05 for the edge models. That is roughly 20x `chat` and over 50x `chat-liquid`, so this is the one skill where the usual savings framing does not hold. Its description says so explicitly, to keep Claude from picking it for prompts that `chat` would handle.
- **`chat-deepseek`** wraps `zerogpu chat -m deepseek-v4-flash`. A 284B MoE model (13B active per token) with the same 1M context, tuned for coding and agentic workflows, at \$0.07 / \$0.14 per 1M. Roughly a sixteenth of `chat-glm`, so it is the better default whenever the task is code or tool-use rather than sheer input size.

Both models are served by the Chat Completions API rather than the Responses API; the CLI routes them automatically.

### Changed

- **`chat` now points at the new skills.** Its "for X use Y" line previously stopped at `chat-qwen`; it now also names `chat-deepseek` and `chat-glm` for input that exceeds its 131K context.
- **The root README's routes table was rewritten.** It had drifted badly: it claimed eleven routes, used the retired MCP-era `zerogpu_*` tool names rather than skill names, listed `zerogpu_chat` as `LFM2.5-1.2B-Instruct` (the default moved to `gpt-oss-120b` in 2.0.0), still showed the old `zlm-v1` enriched IAB id, and omitted `classify-domain`, `generate-followups`, `chat-liquid`, and `chat-qwen` entirely.

### Known issues

- **`chat-deepseek` does not work yet.** `deepseek-v4-flash` is published in the ZeroGPU API reference but not yet served: the API returns `404 model_not_found` for it. The skill is correct per the published spec and will start working the moment the platform enables the model, with no further change here. `chat-glm` was verified working end to end.

### Requires

- `zerogpu-cli` >= 3.4.0, the release that added `glm-5.2` and `deepseek-v4-flash` to the `chat --model` allowlist. Earlier versions reject both with `Unknown model` before any request is made.

## 2.0.0

`chat` now runs on **`gpt-oss-120b`** instead of `LFM2.5-1.2B-Instruct`. The old edge-model behavior moves to a new `chat-liquid` skill, and `chat-gpt-oss` is removed because `chat` now covers it. Skill count stays at 18.

### Breaking

- **`chat-gpt-oss` removed.** `chat` targets the same model, so the two were duplicates. Replace `/zerogpu-router:chat-gpt-oss <text>` with `/zerogpu-router:chat <text>`; the command, output, and cost are identical.
- **`chat` switched models,** `LFM2.5-1.2B-Instruct` to `gpt-oss-120b`. That is 1.2B parameters to a 117B MoE, and a 32,768-token context to 131,072. Answers improve materially on long documents and multi-step instructions, and cost per call goes up: `gpt-oss-120b` is \$0.03 / \$0.10 per 1M input/output tokens against \$0.02 / \$0.05 for the edge model, so roughly 1.5x input and 2x output. Both stay far below frontier pricing. `gpt-oss-120b` also emits a reasoning trace; the skill omits the CLI's `-r` flag, so only the final answer prints.
- **`chat` now requires `zerogpu-cli` ≥ 3.3.0,** the release that added `chat --model`. It previously ran on any 3.x.

**To keep the old behavior,** replace `/zerogpu-router:chat` with `/zerogpu-router:chat-liquid`.

### Added

- **`chat-liquid`** wraps `zerogpu chat -m LFM2.5-1.2B-Instruct`, the fastest and cheapest chat on the platform. Same model and flags `chat` used in 1.6.1. Its internal quoting was switched to the heredoc-into-variable form the other model skills use, which changes nothing about what reaches the model.

### Changed

- Every chat skill now passes `--model` explicitly instead of relying on the CLI default, so a future change to that default cannot silently move a skill onto another model.
- `README.md`: `chat` and `chat-liquid` documented in full, the `chat-gpt-oss` section removed, quick-reference table and CLI version note updated.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.6.1

Documentation punctuation only. **No skill, model, or output changes.** All 18 skills behave exactly as they do in 1.6.0.

### Changed

- `README.md`: removed all 24 em dashes. Each sentence was repunctuated to fit rather than having the dash swapped for a hyphen. Label-then-explanation lines take a colon, joined independent clauses take a semicolon or a full stop, and asides move into parentheses. Two parameter tables used a bare em dash for "no default"; those cells now read `n/a`.
- Plugin heading is now "ZeroGPU Router for Claude Code", previously "ZeroGPU Router — Claude Code plugin".

No content was added or removed, and every command, flag, model id, and example output is untouched.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.6.0

Catches the plugin up to the [ZeroGPU model catalog](https://docs.zerogpu.ai/docs/model-catalog), which added three models and renamed a fourth, and to `zerogpu-cli` 3.3.0, which added the commands to reach them. **Four new skills; the existing 14 are unchanged.**

Requires `zerogpu-cli` **≥ 3.3.0** for the three new model skills — `chat --model` and `classify_domain` landed in that release. The other 15 skills still work on any 3.x.

### Added

- `generate-followups` — suggested next questions for a passage, "people also ask" style. Model `zlm-v1-followup-questions-edge`, wrapping `zerogpu generate_followups`. The CLI has shipped this command since 3.1.0; the plugin never exposed it.
- `classify-domain` — IAB classification from a bare hostname, no page fetch. Model `zlm-v1-iab-domain-classifier`, wrapping `zerogpu classify_domain`. Payloads run up to 10x smaller than sending page text, which is the point for bidstream enrichment and allow/deny-list scoring. Claude strips the scheme, path, and query before calling, so pasting a full URL works.
- `chat-gpt-oss` — heavier chat via `gpt-oss-120b` (117B MoE, 131,072-token context) for long documents and multi-step instructions the 1.2B edge models can't carry. Wraps `zerogpu chat -m gpt-oss-120b`.
- `chat-qwen` — heavier multilingual chat via `qwen3-30b-a3b-fp8` (30.5B MoE, 100+ languages). Wraps `zerogpu chat -m qwen3-30b-a3b-fp8`; this model is served by the Chat Completions API rather than the Responses API, which the CLI handles.

Both new chat models return a reasoning trace. Neither skill passes the CLI's `-r` flag, so only the final answer is printed — matching how `chat` behaves. `chat-thinking` remains the skill that surfaces reasoning.

Savings tracking covers all four: every call goes through the CLI, and 3.3.0 prices each of these models in its savings table, so they contribute to `/zerogpu-router:cost-savings` like any other skill.

### Changed

- `classify-iab-enriched` — documented model renamed `zlm-v1-iab-classify-edge-enriched` → `zlm-v2-iab-classify-edge-enriched`, following the catalog and CLI 3.3.0. No behavior change: the skill still shells out to `zerogpu classify_iab_enriched`.
- `.claude-plugin/marketplace.json` — description now reflects 18 skills and mentions domain classification.
- `README.md` — prerequisites now call out the `zerogpu-cli` ≥ 3.3.0 floor.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.5.1

Cost-savings copy is now host-neutral, and the dollar figure is a rounded estimate. The `💰 ZeroGPU savings` note and the `cost-savings` report previously said "Claude" for the pricing baseline — the same word as the agent host, so "Claude savings" was ambiguous. They now compare against **"your frontier model"** and count **"frontier-model tokens offloaded."** **The 11 auto-invoked model skills and their outputs are unchanged** — they still relay whatever the CLI emits, verbatim.

Requires `zerogpu-cli` ≥ 3.2.1, which carries the reworded, rounded output.

### Changed

- `cost-savings` skill copy — describes savings against "your frontier model" (not "Claude") and calls the dollar figure a **rounded estimate**.
- Savings output (emitted by the CLI, relayed here) — the dollar total now rounds to whole dollars (`≈ $2`, or `under $1` below a dollar) instead of showing cents, and drops the per-model and avg-per-call dollar breakdowns. Token counts stay exact. The baseline is still shown explicitly (`vs baseline claude-opus-4-8`) and remains overridable via `ZEROGPU_SAVINGS_MODEL`.
- `README.md` — updated the illustrative cost-savings output to the new wording and layout.
- `agents/claude/.claude-plugin/plugin.json`: version `1.5.0` → `1.5.1`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.5.0

Skill refresh: the zero-shot classifier gains a confidence threshold, and sign-in drops the retired Project ID. **The other 10 model skills and their outputs are unchanged.**

### Changed

- `classify-zero-shot` — added an optional `-t <0..1>` threshold flag that filters out labels below a confidence (handy for multi-label output). Existing single-label usage is unchanged.
- `signin` — removed the `--project-id` flag and the Project ID prompt. `zerogpu login` now takes just the API key.
- `agents/claude/.claude-plugin/plugin.json`: version `1.4.0` → `1.5.0`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.4.0

Maintenance release: the plugin now carries its own release workflow. The release script and its guide live alongside the plugin under `agents/claude/`, the script gained an interactive version-bump prompt and a hard changelog gate, and CI no longer forces a changelog edit on every PR. **None of the 11 model skills or their outputs change** — installing this is behavior-identical to 1.3.1.

### Changed

- **Release script** — added `scripts/claude-release` (was a repo-root script). Run with no argument it prompts for `patch | minor | major`; it resolves paths from the git root so it runs from any directory; and it now **hard-fails before bumping or pushing** if `agents/claude/CHANGELOG.md` has no `## <version>` heading for the release being cut.
- **Release guide** — added `docs/CLAUDE_PLUGIN_RELEASE_GUIDE.md` documenting the end-to-end flow.
- **CI** — `claude-plugin-validate` no longer requires a CHANGELOG edit on every PR touching `agents/claude/`, and skips CHANGELOG-only changes. The changelog is enforced once, at release time, so several PRs can share a single release section.
- `agents/claude/.claude-plugin/plugin.json`: version `1.3.1` → `1.4.0`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.3.1

Fixes the cost-savings note appearing after **every** routed call. The 1.3.0 relay instruction was loose enough that Claude treated savings as always-relevant and appended a "run `/zerogpu-router:cost-savings`" call-to-action on every response — even though the underlying `💰 ZeroGPU savings` note only fires occasionally (the CLI gates it to roughly 1 in 4–5 calls, emitted on stderr). The cadence was never the problem; the skill prompt was over-surfacing it.

### Changed

- The 11 auto-invoked model skills (`chat`, `chat-thinking`, `classify-*`, `extract-*`, `redact-pii`, `summarize`): tightened the relay line so Claude appends the `💰 ZeroGPU savings …` line **only when it is literally present** in the command output, verbatim, and otherwise says nothing about savings and does not suggest the cost-savings command. Net effect — most responses carry no savings mention; the note shows only on the occasional call where the CLI emits it.
- `agents/claude/.claude-plugin/plugin.json`: version `1.3.0` → `1.3.1`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.3.0

Adds a cost-savings feature so the value of routing trivial work to ZeroGPU is visible. Every routed call records how many Claude tokens it offloaded and the estimated dollars saved, persisted in `~/.zerogpu/savings.json` (alongside the existing credentials). After some responses, a balanced random note (≈ once every 4–5 calls, never twice in a row) surfaces the running total; the new manual `cost-savings` skill prints the full breakdown on demand.

Requires `zerogpu-cli` ≥ 2.3.0, which computes and stores the savings.

### Added

- `cost-savings` skill (`skills/cost-savings/SKILL.md`, manual-only via `disable-model-invocation: true`) — runs `zerogpu cost_savings` and relays a cumulative report: dollars saved, Claude tokens offloaded, routed-call count, per-model breakdown, and the baseline model used.
- A `💰 ZeroGPU savings …` note that the CLI emits to stderr on a balanced random cadence after model commands. Token counts are actual (from the API `usage`); dollar figures estimate what the same tokens would have cost on Claude (default baseline `claude-opus-4-8`, overridable via `ZEROGPU_SAVINGS_MODEL`).

### Changed

- The 11 auto-invoked model skills (`chat`, `chat-thinking`, `classify-*`, `extract-*`, `redact-pii`, `summarize`) gained one trailing line instructing Claude to relay the `💰 ZeroGPU savings` note when present.
- `agents/claude/.claude-plugin/plugin.json`: version `1.2.1` → `1.3.0`; `description` mentions the savings feature.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.2.1

Renames the manual `login` skill to `signin` for clearer intent. The underlying `zerogpu login` CLI subcommand is unchanged — only the skill's name and its slash invocation move from `/zerogpu-router:login` to `/zerogpu-router:signin`. Anyone scripting the old invocation must update it.

### Changed

- `skills/login/` → `skills/signin/` (directory renamed); `SKILL.md` `name:` field `login` → `signin`. The `zerogpu login` body command and `allowed-tools: Bash(zerogpu login*)` are untouched.
- `agents/claude/README.md`: per-skill heading, synopsis, example, lookup-table row, and troubleshooting steps now reference `/zerogpu-router:signin`; the manual-only intro lists `signin`.
- `agents/claude/COOKBOOK.md`, `skills/status/SKILL.md`: "not signed in" guidance now points to `/zerogpu-router:signin`.
- `agents/claude/.claude-plugin/plugin.json`: version `1.2.0` → `1.2.1`.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.2.0

Re-introduces the `summarize` skill, taking the surface from 12 to 13. It was dropped in 1.1.0 when its t5-small space was deprecated; it now runs on `llama-3.1-8b-instruct-fast`, which produces fuller, more coherent abstractive summaries than the old model.

### Added

- `summarize` skill (`skills/summarize/SKILL.md`) — condense a passage into a short summary via `llama-3.1-8b-instruct-fast`. Auto-invokes on "summarize", "TL;DR", "give me the gist", "condense this." Captures `$ARGUMENTS` into `$ZGPU_TEXT` through a single-quoted heredoc, consistent with the shell-safe pattern adopted in 1.1.2.

### Changed

- `agents/claude/.claude-plugin/plugin.json`: version `1.1.2` → `1.2.0`; `description` updated (12 → 13 skills, "summarization" restored); `keywords` re-adds `summarization`.
- `agents/claude/README.md`: added a `summarize` per-skill section with a worked board-meeting example and illustrative output; restored the lookup-table row; intro and skill count updated to 13.
- Root `README.md`: Claude Code skill count updated to 13; "summarize this" restored to the auto-invoke examples.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.1.2

Bug-fix patch. All ten text-accepting skills passed `$ARGUMENTS` directly into the `!` auto-exec block, so any input containing shell metacharacters (newlines, parens, `$`, `&`, `;`, `*`, backticks, quotes) was parsed by zsh and produced errors like `no matches found: (...)` or `command not found: <word>` before reaching the CLI. The fix wraps text in a single-quoted heredoc so the shell treats it as opaque data.

### Changed

- `skills/redact-pii/SKILL.md`, `skills/chat-thinking/SKILL.md`, `skills/classify-iab/SKILL.md`, `skills/classify-iab-enriched/SKILL.md`: text-only skills now capture `$ARGUMENTS` into `$ZGPU_TEXT` via a single-quoted heredoc and pass it as `"$ZGPU_TEXT"`. The model passes raw text — no escaping required, any input is shell-safe.
- `skills/chat/SKILL.md`, `skills/classify-structured/SKILL.md`, `skills/classify-zero-shot/SKILL.md`, `skills/extract-entities/SKILL.md`, `skills/extract-json/SKILL.md`, `skills/extract-pii/SKILL.md`: flag-mixed skills keep `zerogpu … $ARGUMENTS` but add a required "Quoting" section directing the model to wrap the text portion as `"$(cat <<'ZGPU_T' … ZGPU_T )"` with flags following. Plain `"…"` quoting is now explicitly disallowed.

### Unchanged

- `skills/login/SKILL.md`, `skills/status/SKILL.md`: no text input, no change needed.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.1.1

Docs-only patch. Rewrites the `redact-pii` quickstart example so it matches what `gliner-multi-pii-v1` actually masks — the previous passage claimed names, emails, phones, internal hostnames, IPs, card last-fours, and addresses would all come back redacted, but the model only reliably catches names, emails, phones, social handles, and street addresses. The example now uses only PII the model is tuned for, and a callout points to `extract-entities` with custom labels for project-specific identifiers.

### Changed

- `agents/claude/README.md`: trimmed the `redact-pii` quickstart passage to PII the model masks cleanly; softened placeholder claim (uppercase labels like `[PERSON]`, `[EMAIL]`, `[PHONE_NUMBER]`, `[ADDRESS]` rather than fixed tag strings); added callout for hostnames/IPs/contract numbers/card digits.
- Root `README.md`: same edits in the Claude Code quick-start section.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.1.0

Trims the skill surface from 14 to 12. The two HF-Space generation skills (`summarize`, `generate-followups`) were deprecated upstream and have been removed; the quickstart in `agents/claude/README.md` now demonstrates `redact-pii` instead of `summarize`.

### Removed

- `summarize` skill (`skills/summarize/SKILL.md`) — t5-small space deprecated.
- `generate-followups` skill (`skills/generate-followups/SKILL.md`) — `zlm-v1-followup-questions-edge` space deprecated.

### Changed

- `agents/claude/.claude-plugin/plugin.json`: version `1.0.0` → `1.1.0`; `description` updated (14 → 12 skills, dropped "summarization" and "follow-ups"); `keywords` no longer includes `summarization`.
- `agents/claude/README.md`: quickstart example switched from `summarize` to `redact-pii`; per-skill sections for the two removed skills deleted.
- Root `README.md`: install/usage snippets updated; Claude Code install command refreshed.
- `.gitignore`: ignore local `docs/` working directory.

### Install

```
/plugin marketplace add zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

## 1.0.0

First stable release of the `zerogpu-router` Claude Code plugin. The pre-release routed all offload calls through a single model-invoked skill that called MCP tools; 1.0.0 replaces that with a fan-out of 14 narrowly-scoped skills, each shelling out to the `zerogpu` CLI. Net effect: the model picks one skill per intent instead of one skill picking one tool per intent, and there is no MCP server in the loop.

### Architecture

- **MCP → CLI.** Skills no longer call `zerogpu_*` MCP tools. Each skill is now a `SKILL.md` that runs `zerogpu <subcommand> $ARGUMENTS` via `Bash`, gated by an `allowed-tools` permission (e.g. `Bash(zerogpu classify_iab *)`). Users need the `zerogpu` CLI installed and authenticated locally.
- **One skill per capability.** The monolithic `plugins/zerogpu-router/skill/SKILL.md` and its tool-selection table are gone; the routing decision has been pushed into 14 skill `description` fields under `skills/`, where Claude's auto-invocation matches them directly.
- **Auto-discovery.** `plugin.json` no longer declares a `skills: [...]` array — skills are discovered from `skills/*/SKILL.md`.

### Skills shipped (14)

Classification:
- `classify-iab` — IAB taxonomy categories with confidence scores.
- `classify-iab-enriched` — IAB plus topics, keywords, inferred intent. Promoted from the old `enriched: true` flag into a standalone skill.
- `classify-zero-shot` — caller-supplied labels via `-l` / `--labels` (deberta-v3-small).
- `classify-structured` — multi-axis classification driven by a JSON schema `{axis: [labels...]}` (gliner2-base-v1).

Extraction:
- `extract-entities` — custom-label NER with optional `-t <threshold>` (gliner2-base-v1).
- `extract-json` — schema-driven JSON extraction with `name::type::description` field syntax.
- `extract-pii` — PII grouped by category with optional `-c` and `-t` (gliner-multi-pii-v1).
- `redact-pii` — in-line `[LABEL]` masking; complements `extract-pii`.

Generation:
- `summarize` — passage summarization (t5-small).
- `generate-followups` — follow-up question generation (zlm-v1-followup-questions-edge).
- `chat` — short single-turn replies (LFM2.5-1.2B-Instruct), with optional `-i "<system instructions>"`.
- `chat-thinking` — reasoning-trace variant (LFM2.5-1.2B-Thinking). Promoted from the old `thinking: true` flag.

Account (user-invokable only, `disable-model-invocation: true`):
- `login` — interactive or `--api-key` / `--project-id` non-interactive sign-in; persists creds and upserts `ZEROGPU_API_KEY` into the shell profile.
- `status` — show signed-in state and masked API key; exits non-zero when signed out.

### Removed

- Old `agents/claude/plugins/zerogpu-router/skill/SKILL.md` and its nested `plugin.json`.
- `zerogpu_health` tool — no longer surfaced as a skill; health is implicit in CLI exit codes.
- `blog/introducing-zerogpu-router.md` and unused assets (`assets/logo.svg`, `assets/zerogpu-dashboard.png`).

### Manifest changes

- `agents/claude/.claude-plugin/plugin.json`: version `0.1.0` → `1.0.0`; added `$schema`, `displayName: "ZeroGPU Router"`; author expanded with email and URL; `homepage` now `https://zerogpu.ai`; keywords broadened (`pii`, `ner`, `nlp`, `cost-optimization`, `small-models`, `claude-code`); removed explicit `skills` array.
- `.claude-plugin/marketplace.json`: marketplace `name` renamed `zerogpu-router` → `zerogpu` (the marketplace now namespaces the plugin, not duplicates it); added `$schema`, marketplace `description`, owner email, plugin `category: "productivity"` and `tags`.

### Docs

- `agents/claude/README.md` expanded substantially (+~600 lines) with per-skill usage, argument shapes, and the `zerogpu` CLI prerequisites.
- Root `README.md` updated to point at the new install path.

### Install

```
/plugin marketplace add github.com/zerogpu/zerogpu-router
/plugin install zerogpu-router@zerogpu
```

(Marketplace name is now `zerogpu`, not `zerogpu-router`.)
