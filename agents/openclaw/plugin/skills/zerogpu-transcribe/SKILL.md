---
name: zerogpu-transcribe
description: Transcribe speech to text with whisper-tiny, OpenAI's 39M-parameter Whisper model and the smallest in the family, built for fast, high-volume, latency- and cost-sensitive audio workloads. It recognizes speech across many languages and can translate speech into English. Use for voice agents, meeting transcription, subtitles, podcasts, and audio indexing where speed and cost matter more than the accuracy of larger speech models. The caller supplies the audio in the form the ZeroGPU API accepts; this skill does not upload a local file.
argument-hint: "<request>"
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

Call whisper-tiny. Run this with the `exec` tool, pasting the user's request into the heredoc verbatim — no escaping or quoting required (the quoted heredoc handles every shell metacharacter, newline, quote, and paren safely):

```bash
zerogpu chat_completions -m whisper-tiny <<'ZGPU_END_OF_INPUT'
<the user's request, verbatim>
ZGPU_END_OF_INPUT
```

Output is the model's response as the API returns it. Relay the transcript as-is — do not rewrite, punctuate, or expand it.

At \$0.02 per minute of audio it is priced for high-volume transcription and bills nothing per token. It recognizes speech across many languages and can translate speech into English.

**This skill sends the request as text**, which is what `zerogpu chat_completions` carries, so it cannot upload a recording on its own: the audio has to be supplied in the form the ZeroGPU API accepts for this model ([docs.zerogpu.ai](https://docs.zerogpu.ai)). Do not promise the user a transcript of a local file. For the other direction, `zerogpu-speak` is the text-to-speech route.

Savings note: only if the command output literally contains a line starting with `💰 ZeroGPU savings`, append that exact line, unchanged, as the last line of your reply. If no such line is present, say nothing about savings and do not mention or suggest the `cost-savings` skill — this note is intentionally occasional, not shown every time.
