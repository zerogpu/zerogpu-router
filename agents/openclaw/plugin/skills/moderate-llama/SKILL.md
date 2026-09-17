---
name: moderate-llama
description: Screen text with llama-guard-4-12b, Meta's dedicated 12B safety classifier (164K-token context), which returns a safe/unsafe verdict plus the policy categories a violation falls under. Use for long passages, whole chat transcripts, or a model's own reply, and for brand-safety and policy-enforcement checks. Use moderate for short passages — it is far cheaper — and this when the text is longer than moderate can take.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
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

Run safety screening. Run this with the `exec` tool, pasting the text to screen into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m llama-guard-4-12b <<'ZGPU_END_OF_INPUT'
<the text to screen, verbatim>
ZGPU_END_OF_INPUT
```

Output is the model's verdict as plain text: safe or unsafe, with the relevant policy categories when it detects a violation. Report the verdict first, then the categories it names. Do not restate the flagged text itself.

A dense 12B model derived from Llama 4 Scout, built as a safety layer for production AI applications and able to evaluate an incoming prompt or a generated response, in multiple languages. At \$0.18 / \$0.18 per 1M input/output tokens it costs nine times `moderate` (`zlm-v1-moderation-edge`, \$0.02 / \$0.05) on input and under four times on output, so keep `moderate` for short passages and OpenAI's 13-category envelope, and reach for this when the text exceeds that model's 800-token window or you want the violated policy categories named.

Screening text is a safety check, not an endorsement. Run it on request even when the passage is unpleasant — reporting that something is flagged is the whole point of the skill.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
