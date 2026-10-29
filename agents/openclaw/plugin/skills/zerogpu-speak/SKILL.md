---
name: zerogpu-speak
description: Generate speech from text with chatterbox-nano, Resemble AI's 110M-parameter text-to-speech model, built for fast, high-quality speech generation at low latency, with expressive speech and voice cloning. Use for voice agents, conversational AI, gaming, accessibility, audiobooks, and content creation — anywhere the user asks to read text aloud, narrate it, or turn it into audio.
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

Call chatterbox-nano. Run this with the `exec` tool, pasting the text to speak into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m chatterbox-nano <<'ZGPU_END_OF_INPUT'
<the text to speak, verbatim>
ZGPU_END_OF_INPUT
```

Output is the model's response as the API returns it. Report what was synthesized and relay the response's own reference to the audio — do not print an encoded audio payload back to the user.

At \$0.01 per minute of generated audio it is the cheapest audio model on the platform and bills nothing per token. `zerogpu chat_completions` writes the response to stdout and takes no output-file option, so this skill does not save a playable file; if the user needs one, say so rather than reporting a path that does not exist. For the other direction, `zerogpu-transcribe` is the speech-to-text route.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
