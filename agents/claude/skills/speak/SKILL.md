---
name: speak
description: Generate speech from text with chatterbox-nano, Resemble AI's 110M-parameter text-to-speech model, built for fast, high-quality speech generation at low latency, with expressive speech and voice cloning. Use for voice agents, conversational AI, gaming, accessibility, audiobooks, and content creation — anywhere the user asks to read text aloud, narrate it, or turn it into audio.
argument-hint: "<text>"
allowed-tools: Bash(zerogpu chat_completions *)
---

Call chatterbox-nano. `$ARGUMENTS` is the raw text to speak — pass it verbatim, no escaping or quoting required (the heredoc below handles every shell metacharacter, newline, quote, and paren safely):

```!
zerogpu chat_completions -m chatterbox-nano <<'ZGPU_END_OF_INPUT'
$ARGUMENTS
ZGPU_END_OF_INPUT
```

Output is the model's response carrying the generated audio. Say what was synthesized and where the audio came back — do not print the raw payload, which is binary or encoded audio.

At \$0.01 per minute of generated audio it is the cheapest audio model on the platform and bills nothing per token. For the other direction, `/zerogpu-router:transcribe` turns speech into text.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest `/zerogpu-router:cost-savings` — this note is intentionally occasional, not shown every time.
