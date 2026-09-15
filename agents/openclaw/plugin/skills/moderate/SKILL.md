---
name: moderate
description: Screen text for unsafe, harmful, or policy-sensitive content and return a safety verdict across OpenAI's 13 moderation categories. Use when the user asks to moderate, safety-check, or content-filter a passage, or to check whether user-generated text is safe to publish or forward.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu moderations *)
metadata:
  openclaw:
    requires:
      bins: [zerogpu]
    install:
      - kind: node
        package: zerogpu-cli
        bins: [zerogpu]
---

> **Sends your input to ZeroGPU's hosted API** for inference — this is not local processing. Don't pass secrets, credentials, or regulated data you aren't cleared to share with a third party. See the plugin README's "Data & privacy" section.

Run moderation. Run this with the `exec` tool, pasting the text to screen into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu moderations -m zlm-v1-moderation-edge <<'ZGPU_END_OF_INPUT'
<the text to screen, verbatim>
ZGPU_END_OF_INPUT
```

Output is OpenAI's moderations envelope as JSON: for each entry in `results`, a `flagged` verdict, per-category booleans in `categories`, and calibrated confidence scores in `category_scores`, across all 13 safety categories. Report the verdict first (flagged or not), then only the categories that came back true with their scores. Do not restate the flagged text itself.

Backed by `zlm-v1-moderation-edge` (86M parameters, \$0.02 / \$0.05 per 1M input/output tokens), an edge model that beats `omni-moderation-latest` on the binary safe/unsafe decision and on 9 of 13 categories. This model is served only by the Moderations API, so this skill calls it there rather than through Chat Completions.

Screening text is a safety check, not an endorsement. Run it on request even when the passage is unpleasant — reporting that something is flagged is the whole point of the skill.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
