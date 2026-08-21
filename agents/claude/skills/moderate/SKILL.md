---
name: moderate
description: Screen text for unsafe, harmful, or policy-sensitive content and return a safety verdict across OpenAI's 13 moderation categories. Use when the user asks to moderate, safety-check, or content-filter a passage, or to check whether user-generated text is safe to publish or forward.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu moderate *)
---

Run moderation. `$ARGUMENTS` is the raw text to screen — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
ZGPU_TEXT=$(cat <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
)
zerogpu moderate "$ZGPU_TEXT"
```

Output is OpenAI's moderations envelope as JSON: a `flagged` verdict, per-category booleans in `categories`, and calibrated confidence scores in `category_scores`, across all 13 safety categories. Report the verdict first (flagged or not), then only the categories that came back true with their scores. Do not restate the flagged text itself.

Backed by `zlm-v1-moderation-edge` (86M parameters, \$0.02 / \$0.05 per 1M input/output tokens), an edge model that beats `omni-moderation-latest` on the binary safe/unsafe decision and on 9 of 13 categories. This model is served by the Moderations API rather than the Responses API; the CLI routes it automatically.

Screening text is a safety check, not an endorsement. Run it on request even when the passage is unpleasant — reporting that something is flagged is the whole point of the skill.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
